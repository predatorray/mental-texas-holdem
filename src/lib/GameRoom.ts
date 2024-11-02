import EventEmitter from "eventemitter3";
import { DataConnection, DataConnectionErrorType, MediaConnection, PeerConnectOption } from "peerjs";
import Deferred from "./Deferred";
import { decrypt, encrypt } from "./HybridPublicKeyCrypto";
import { arrayBufferToHex, hexToArrayBuffer } from "./utils";
import LifecycleManager from "./LifecycleManager";
import {EventListener} from "./types";

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
}

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

export interface GameRoomEvents<T> {
  status: (status: GameRoomStatus) => void;
  connected: (peerId: string) => void;
  members: (members: string[]) => void;
  event: (e: T, fromWhom: string) => void;
}

export type GameRoomOptions = {
  hostId?: string;
  modulusLength?: number;
}

export interface DataConnectionLikeEvents {
  open: () => void;
  data: (data: unknown) => void;
  error: (error: any) => void;
  iceStateChanged: (state: RTCIceConnectionState) => void;
  close: () => void;
}

export interface EventEmitterLike<
  EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
  Context extends any = any
> {
  on<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn: EventEmitter.EventListener<EventTypes, T>,
    context?: Context
  ): this;

  off<T extends EventEmitter.EventNames<EventTypes>>(
    event: T,
    fn?: EventEmitter.EventListener<EventTypes, T>,
    context?: Context,
    once?: boolean
  ): this;
}

export interface DataConnectionLike extends EventEmitterLike<DataConnectionLikeEvents, DataConnectionErrorType> {
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
  error: (error: any) => void;
}

export interface PeerLike extends EventEmitterLike<PeerLikeEvents, never> {
  connect(peer: string, options?: PeerConnectOption): DataConnectionLike
}

export default class GameRoom<T> {
  private readonly emitter = new EventEmitter<GameRoomEvents<GameEvent<T>>>();
  protected readonly hostConnectionPromise: Promise<DataConnection | DataConnectionLike | null>;
  private readonly guestConnectionPromises: Map<string, Promise<DataConnection | DataConnectionLike>> = new Map();

  private _status: GameRoomStatus;
  private membersSyncedFromHost: string[] = [];

  // RSA Keys
  public readonly rsaKeyPairPromise: Promise<CryptoKeyPair>;
  public readonly jwk: Promise<JsonWebKey>;
  private rsaPublicKeysOfOthers: Map<string, Deferred<CryptoKey>> = new Map();

  public peerId?: string;
  private peerIdDeferred = new Deferred<string>();

  public hostId?: string;

  private readonly lcm = new LifecycleManager();

  constructor(peer: PeerLike, options?: GameRoomOptions) {
    this._status = 'NotReady';
    this.emitter.emit('status', this._status);
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
    this.jwk = this.rsaKeyPairPromise.then(rsaKeyPair => window.crypto.subtle.exportKey(
      'jwk',
      rsaKeyPair.publicKey,
    ));

    this.hostId = options?.hostId;

    this.hostConnectionPromise = new Promise<DataConnection | DataConnectionLike | null>((resolve, reject) => {
      peer.on('open', this.lcm.register(peerId => {
        console.info(`Connected to the PeerJS server. (peerId = ${peerId}).`);
        this.peerId = peerId;
        this.peerIdDeferred.resolve(peerId);
        this._status = 'PeerServerConnected';
        this.emitter.emit('status', this._status);
        this.emitter.emit('connected', peerId);
  
        if (!options?.hostId) {
          resolve(null);
          return;
        }

        console.info(`Connecting to the remote peer (${options.hostId})`);
        const hostConn = peer.connect(options.hostId, PEER_CONNECT_OPTIONS);
        hostConn.on('open', () => {
          console.info(`Connected to the remote peer (${options.hostId}) successfully.`);
          this._status = 'HostConnected';
          this.emitter.emit('status', this._status);
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

    if (!options?.hostId) { // if it is a host
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
        const membersChangedEvent: MembersChangedEvent = {
          type: '_members',
          data: this.members,
        };
        this.sendMessageToAllGuests(membersChangedEvent);
        this.publishPublicKeyToSingleGuest(conn.peer); // publish the host's public key again when there is a new guest
        this.emitter.emit('members', this.members);
      }, listener => peer.off('connection', listener)));
    }

    peer.on('close', () => {
      this._status = 'Closed';
      this.emitter.emit('status', this._status);
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

  async emitEvent(e: GameEvent<T>) {
    if (this.hostId) {
      await this.fireEventFromGuest(e);
    } else {
      await this.fireEventFromHost(e);
    }
  }

  onEvent(handler: (e: GameEvent<T>, fromWhom: string) => void) {
    this.emitter.on('event', handler);
  }

  offEvent(handler?: (e: GameEvent<T>, fromWhom: string) => void) {
    this.emitter.off('event', handler);
  }

  get peerIdAsync() {
    return this.peerIdDeferred.promise;
  }

  get listener(): EventListener<GameRoomEvents<GameEvent<T>>> {
    return this.emitter;
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
          this.emitter.emit('members', this.members);
          this.publishPublicKey();
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
          const rsaPublicKeyDeferred = this.rsaPublicKeysOfOthers.get(e.sender);
          if (rsaPublicKeyDeferred) {
            rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
          } else {
            // in case _publicKey event arrives before _members
            const deferred = new Deferred<CryptoKey>();
            this.rsaPublicKeysOfOthers.set(e.sender, deferred);
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
          const rsaPublicKeyDeferred = this.rsaPublicKeysOfOthers.get(e.sender);
          if (rsaPublicKeyDeferred) {
            rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
          } else {
            // in case _publicKey event arrives before _members
            if (!this.rsaPublicKeysOfOthers.has(e.sender)) {
              const deferred = new Deferred<CryptoKey>();
              this.rsaPublicKeysOfOthers.set(e.sender, deferred);
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
    if (e.type === 'public') {
      await this.sendMessageToHost(e);
    } else if (e.recipient !== this.peerId) {
      // when sending private message from guest,
      // encryption is required, since host is acting as a relay, who can potentially see the plaintext
      const recipientRsaKeyDeferred = (() => {
        const recipientRsaKeyDeferred = this.rsaPublicKeysOfOthers.get(e.recipient);
        if (recipientRsaKeyDeferred) {
          return recipientRsaKeyDeferred;
        }
        // create the Deferred object even the recipient is still unknown.
        // this could happen when the sender knows the peer.id of the recipient before a `_members` event (e.g. unit testing).
        const newDeferred = new Deferred<CryptoKey>();
        this.rsaPublicKeysOfOthers.set(e.recipient, newDeferred);
        return newDeferred;
      })();
      const recipientPublicKey = await recipientRsaKeyDeferred.promise;
      const dataAsBuffer = new TextEncoder().encode(JSON.stringify(e));
      const encrypted = await encrypt(dataAsBuffer, recipientPublicKey);
      const encryptedHex = arrayBufferToHex(encrypted);
      const encryptedEvent: EncryptedPrivateGameEvent = {
        type: '_encrypted',
        sender: e.sender,
        recipient: e.recipient,
        cipherHex: encryptedHex,
      };
      await this.sendMessageToHost(encryptedEvent);
    }
    this.emitter.emit('event', e, await this.peerIdAsync); // echo
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
          this.emitter.emit('event', e, await this.peerIdAsync); // echo
        }
        break;
      case 'public':
        await this.sendMessageToAllGuests(e);
        this.emitter.emit('event', e, await this.peerIdAsync); // echo
        break;
    }
  }

  /**
   * Sends PublicKeyEvent to all guests
   */
  private async publishPublicKey() {
    if (this.hostId) {
      await this.sendMessageToHost(await this.publicKeyEventAsync());
    } else {
      await this.sendMessageToAllGuests(await this.publicKeyEventAsync());
    }
  }

  /**
   * Sends PublicKeyEvent to a single guest
   */
  private async publishPublicKeyToSingleGuest(guestPeerId: string) {
    await this.sendMessageToSingleGuest(guestPeerId, await this.publicKeyEventAsync());
  }

  /**
   * @returns PublicKeyEvent from JSON Web Key (asynchronously)
   */
  private async publicKeyEventAsync(): Promise<PublicKeyEvent> {
    return {
      type: '_publicKey',
      sender: await this.peerIdAsync,
      jwk: await this.jwk,
    };
  }
}
