import EventEmitter from "eventemitter3";
import { BaseConnectionErrorType, DataConnection, DataConnectionErrorType, MediaConnection, PeerConnectOption, PeerError, PeerErrorType } from "peerjs";
import Deferred from "./Deferred";
import { decrypt, encrypt } from "./HybridPublicKeyCrypto";
import { arrayBufferToHex, hexToArrayBuffer } from "./utils";
import LifecycleManager from "./LifecycleManager";

const PEER_CONNECT_OPTIONS = {
  reliable: true,
  serialization: 'json',
};

export type GameRoomStatus =
  | 'NotReady'
  | 'PeerServerConnected'
  | 'HostConnected'
  | 'Closed'
;

export interface PublicGameEvent<T> {
  type: 'public';
  sender: string;
  data: T;
}

export interface PrivateGameEvent<T> {
  type: 'private';
  sender: string;
  recipient: string;
  data: T;
};

export type GameEvent<T> = PublicGameEvent<T> | PrivateGameEvent<T>;

export interface MembersChangedEvent {
  type: '_members';
  data: string[];
}

export interface PublicKeyEvent {
  type: '_publicKey';
  sender: string;
  jwk: JsonWebKey;
}

export interface EncryptedPrivateGameEvent {
  type: '_encrypted';
  sender: string;
  recipient: string;
  cipherHex: string;
}

export type InternalEvent =
  | MembersChangedEvent
  | PublicKeyEvent
  | EncryptedPrivateGameEvent
;

export type GameRoomEvents<T> = {
  event: (e: T, fromWhom: string) => void;
}

export type GameRoomOptions = {
  hostId?: string;
  modulusLength?: number;
}

export interface DataConnectionLikeEvents {
  open: () => void;
  data: (data: unknown) => void;
  error: (error: PeerError<DataConnectionErrorType | BaseConnectionErrorType>) => void;
  iceStateChanged: (state: RTCIceConnectionState) => void;
  close: () => void;
}

export interface DataConnectionLike extends EventEmitter<DataConnectionLikeEvents, DataConnectionErrorType> {
  readonly peer: string;
  send(data: any, chunked?: boolean): void | Promise<void>;
  close(): void;
}

export interface PeerLikeEvents {
  open: (id: string) => void;
  connection: (dataConnection: DataConnectionLike) => void;
  call: (mediaConnection: MediaConnection) => void;
  close: () => void;
  disconnected: (currentId: string) => void;
  error: (error: PeerError<`${PeerErrorType}`>) => void;
}

export interface PeerLike extends EventEmitter<PeerLikeEvents, never> {
  connect(peer: string, options?: PeerConnectOption): DataConnectionLike
}

export default class GameRoom<T> {
  private readonly emitter = new EventEmitter<GameRoomEvents<GameEvent<T>>>();
  protected readonly hostConnectionPromise: Promise<DataConnection | DataConnectionLike | null>;
  private readonly guestConnectionPromises: Map<string, Promise<DataConnection | DataConnectionLike>> = new Map();

  private _status: GameRoomStatus;
  private membersSyncedFromHost: string[] = [];
  protected rsaKeyPairPromise: Promise<CryptoKeyPair>;
  private rsaPublicKeys: Map<string, Deferred<CryptoKey>> = new Map();

  public peerId?: string;
  public hostId?: string;

  private readonly lcm = new LifecycleManager();

  constructor(peer: PeerLike, options?: GameRoomOptions) {
    this._status = 'NotReady';
    this.rsaKeyPairPromise = window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: options?.modulusLength ?? 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );

    this.hostId = options?.hostId;

    this.hostConnectionPromise = new Promise<DataConnection | DataConnectionLike | null>((resolve, reject) => {
      peer.on('open', this.lcm.register(peerId => {
        console.info(`Connected to the PeerJS server. (peerId = ${peerId}).`);
        this.peerId = peerId;
        this._status = 'PeerServerConnected';
  
        if (!options?.hostId) {
          resolve(null);
          return;
        }

        console.info(`Connecting to the remote peer (${options.hostId})`);
        const hostConn = peer.connect(options.hostId, PEER_CONNECT_OPTIONS);
        hostConn.on('open', () => {
          console.info(`Connected to the remote peer (${options.hostId}) successfully.`);
          this._status = 'HostConnected';
          resolve(hostConn);
          return;
        });
        hostConn.on('error', error => {
          reject(error);
          return;
        });
        hostConn.on('close', () => {
          console.info(`The remote connection is closed (${options.hostId}).`);
        });
        hostConn.on('data', (data) => {
          this.handleData(data, hostConn.peer);
        });
        return;
      }, listener => peer.off('open', listener)));
    });

    if (!options?.hostId) {
      peer.on('connection', this.lcm.register((conn) => {
        const openedConnPromise = new Promise<DataConnectionLike>((resolve, reject) => {
          conn.on('open', () => {
            console.info(`Established connection with the peer (peerId = ${conn.peer}).`);
            resolve(conn);
          });
          conn.on('data', (data) => {
            this.handleData(data, conn.peer);
          });
          conn.on('error', error => {
            reject(error);
          });
        });
        const previousGuestConnPromise = this.guestConnectionPromises.get(conn.peer);
        if (previousGuestConnPromise) {
          previousGuestConnPromise.then(conn => conn.close());
        }
        this.guestConnectionPromises.set(conn.peer, openedConnPromise);
        conn.on('close', () => {
          console.info(`The client connection is closed. (peerId = ${conn.peer}).`);
          this.guestConnectionPromises.delete(conn.peer);
        });
      }, listener => peer.off('connection', listener)));
    }

    peer.on('close', () => {
      this._status = 'Closed';
    });
  }

  close() {
    this.lcm.close();
  }

  get status() {
    return this._status;
  }

  get members() {
    if (this.hostId) {
      return this.membersSyncedFromHost;
    }
    return this.peerId
      ? [this.peerId, ...(Array.from(this.guestConnectionPromises.keys()) || [])]
      : [];
  }

  async emit(e: GameEvent<T>) {
    if (this.hostId) {
      this.fireEventFromGuest(e);
    } else {
      this.fireEventFromHost(e);
    }
  }

  on(handler: (e: GameEvent<T>, fromWhom: string) => void) {
    this.emitter.on('event', handler);
  }

  off(handler?: (e: GameEvent<T>, fromWhom: string) => void) {
    this.emitter.off('event', handler);
  }

  private async sendMessageToSingleGuest(guestPeerId: string, data: any) {
    const guestConn = this.guestConnectionPromises.get(guestPeerId);
    if (!guestConn) {
      console.warn(`The message is dropped because the connection (peerId = ${guestPeerId}) is not found.`);
      console.debug(data);
      return;
    }
    console.info(`Sending a message to the client (peerId = ${guestPeerId}).`);
    console.debug(data);
    (await guestConn).send(data);
  }

  private async sendMessageToAllGuests(data: any, exceptPeerId?: string) {
    if (this.guestConnectionPromises.size === 0) {
      return;
    }
    if (exceptPeerId) {
      console.debug(`Sending a message to all the ${this.guestConnectionPromises.size} clients except the peer (peerId = ${exceptPeerId}).`);
    } else {
      console.debug(`Sending a message to all the ${this.guestConnectionPromises.size} clients.`);
    }
    console.debug(data);
    for (const [peerId, guestConnectionPromise] of Array.from(this.guestConnectionPromises.entries())) {
      const guestConnection = await guestConnectionPromise;
      if (guestConnection!.peer !== exceptPeerId) {
        console.debug(`Sending a message to the client (peerId = ${peerId}):`);
        console.debug(data);
        await guestConnection!.send(data);
      }
    }
  }

  private async sendMessageToHost(data: any) {
    const hostConnection = await this.hostConnectionPromise;
    if (!hostConnection) {
      throw new Error('Host Connection is not available in non-Guest mode.');
    }
    console.debug(`Sending a message to the host (peerId = ${this.hostId}).`)
    console.debug(data);
    await hostConnection.send(data);
  }

  private handleData(data: unknown, whom: string) {
    const e = data as (GameEvent<T> | InternalEvent);
    if (!e || !e.type) {
      console.error('missing event or type');
      return;
    }
    console.info(`Received GameEvent ${e.type} from ${whom}.`);
    console.debug(e);
    if (this.hostId) {
      // guest mode
      switch (e.type) {
        case 'private':
          if (e.recipient === this.peerId) {
            this.emitter.emit('event', e, e.sender);
          }
          break;
        case 'public':
          this.emitter.emit('event', e, e.sender);
          break;
        case '_members':
          this.membersSyncedFromHost = e.data;
          break;
        case '_publicKey':
          const rsaPulbicKeyPromise = window.crypto.subtle.importKey(
            'jwk',
            e.jwk,
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256',
            },
            false,
            ['encrypt'],
          );
          const rsaPublicKeyDeferred = this.rsaPublicKeys.get(e.sender);
          if (rsaPublicKeyDeferred) {
            rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
          } else {
            // in case _publicKey event arrives before _members
            const deferred = new Deferred<CryptoKey>();
            this.rsaPublicKeys.set(e.sender, deferred);
            deferred.resolve(rsaPulbicKeyPromise);
          }
          break;
        case '_encrypted':
          // decrypt using own private key and emit the decrypted PrivateGameEvent
          this.rsaKeyPairPromise.then(rsaKeyPair => {
            decrypt(
              hexToArrayBuffer(e.cipherHex),
              rsaKeyPair!.privateKey,
            ).then(decryptedData => {
              const data = JSON.parse(new TextDecoder().decode(decryptedData));
              this.emitter.emit('event', data, whom);
            });
          });
          break;
      }
    } else {
      // host mode
      switch (e.type) {
        case 'private':
          if (e.recipient !== this.peerId) {
            console.warn(`Received a private message in plaintext (sender = ${whom}, recipient = ${e.recipient}).`);
            this.sendMessageToSingleGuest!(e.recipient, e);
          } else {
            this.emitter.emit('event', e, whom);
          }
          break;
        case 'public':
          this.sendMessageToAllGuests!(e, whom);
          this.emitter.emit('event', e, whom);
          break;
        case '_publicKey':
          this.sendMessageToAllGuests!(e, whom);
          const rsaPulbicKeyPromise = window.crypto.subtle.importKey(
            'jwk',
            e.jwk,
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256',
            },
            false,
            ['encrypt'],
          );
          const rsaPublicKeyDeferred = this.rsaPublicKeys.get(e.sender);
          if (rsaPublicKeyDeferred) {
            rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
          } else {
            // in case _publicKey event arrives before _members
            if (!this.rsaPublicKeys.has(e.sender)) {
              const deferred = new Deferred<CryptoKey>();
              this.rsaPublicKeys.set(e.sender, deferred);
              deferred.resolve(rsaPulbicKeyPromise);
            }
          }
          break;
        case '_encrypted':
          if (e.recipient === this.peerId) {
            // decrypt using host's private key and emit the decrypted PrivateGameEvent
            this.rsaKeyPairPromise.then(rsaKeyPair => {
              decrypt(
                hexToArrayBuffer(e.cipherHex),
                rsaKeyPair!.privateKey,
              ).then(decryptedData => {
                const data = JSON.parse(new TextDecoder().decode(decryptedData));
                this.emitter.emit('event', data, whom);
              });
            });
          } else {
            this.sendMessageToSingleGuest!(e.recipient, e);
          }
          break;
      }
    }
  }

  private async fireEventFromGuest(e: GameEvent<T>) {
    console.info(`Sending GameEvent ${e.type}.`);
    console.debug(e);
    if (e.type === 'private') {
      // when sending private message from guest,
      // encryption is required, since host is acting as a relay, who can potentially see the plaintext
      const recipientPublicKey = await this.rsaPublicKeys.get(e.recipient)!.promise;
      const dataAsBuffer = new TextEncoder().encode(JSON.stringify(e.data));
      const encrypted = await encrypt(dataAsBuffer, recipientPublicKey);
      const encryptedHex = arrayBufferToHex(encrypted);
      const encryptedEvent: EncryptedPrivateGameEvent = {
        type: '_encrypted',
        sender: e.sender,
        recipient: e.recipient,
        cipherHex: encryptedHex,
      };
      await this.sendMessageToHost(encryptedEvent);
    } else {
      await this.sendMessageToHost(e);
    }
    this.emitter.emit('event', e, this.peerId!); // echo
  }

  private async fireEventFromHost(e: GameEvent<T>) {
    console.debug(`Sending GameEvent ${e.type}.`);
    console.debug(e);
    switch (e.type) {
      case 'private':
        if (e.recipient !== this.peerId) {
          // when sending private messages from host,
          // encryption is not required, since the connection is end-to-end with a relay.
          await this.sendMessageToSingleGuest(e.recipient, e);
        } else {
          this.emitter.emit('event', e, this.peerId!); // echo
        }
        break;
      case 'public':
        await this.sendMessageToAllGuests(e);
        this.emitter.emit('event', e, this.peerId!); // echo
        break;
    }
  }
}
