import EventEmitter from "eventemitter3";
import Deferred from "./Deferred";
import {EventListener} from "./types";

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

export interface GameRoomEvents<T> {
  status: (status: GameRoomStatus) => void;
  connected: (peerId: string) => void;
  members: (members: string[]) => void;
  event: (e: T, fromWhom: string, replay?: boolean) => void;
}

export type GameRoomOptions = {
  hostId?: string;
}

/**
 * Minimal interface for the mesh network that GameRoom depends on.
 * This matches the public API of DandelionMesh.
 */
export interface MeshLike<T> {
  readonly peerId: string | undefined;
  readonly peers: string[];
  readonly leaderId: string | null;
  sendPublic(data: T): Promise<boolean>;
  sendPrivate(recipientPeerId: string, data: T): Promise<boolean>;
  on(event: 'ready', listener: (localPeerId: string) => void): void;
  on(event: 'message', listener: (message: { type: 'public'; sender: string; data: T } | { type: 'private'; sender: string; recipient: string; data: T }, replay: boolean) => void): void;
  on(event: 'peersChanged', listener: (peers: string[]) => void): void;
  on(event: 'leaderChanged', listener: (leaderId: string | null) => void): void;
  on(event: 'error', listener: (error: Error) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  close(): void;
}

export default class GameRoom<T> {
  private readonly emitter = new EventEmitter<GameRoomEvents<GameEvent<T>>>();
  private readonly mesh: MeshLike<T>;

  private _status: GameRoomStatus = 'NotReady';

  public peerId?: string;
  private peerIdDeferred = new Deferred<string>();
  private leaderDeferred: Deferred<void> | null = new Deferred<void>();

  public readonly hostId?: string;

  constructor(mesh: MeshLike<T>, options?: GameRoomOptions) {
    this.hostId = options?.hostId;
    this.mesh = mesh;

    this.mesh.on('ready', (peerId: string) => {
      console.debug(`Connected to the PeerJS server. (peerId = ${peerId}).`);
      this.peerId = peerId;
      this.peerIdDeferred.resolve(peerId);
      this._status = 'PeerServerConnected';
      this.emitter.emit('status', this._status);
      this.emitter.emit('connected', peerId);

      if (!this.hostId) {
        // Room creator: emit initial members (just self)
        this.emitter.emit('members', this.members);
      }
    });

    this.mesh.on('peersChanged', (_peers: string[]) => {
      // For joiners, transition to HostConnected when connected to a peer
      if (this.hostId && this._status === 'PeerServerConnected') {
        this._status = 'HostConnected';
        this.emitter.emit('status', this._status);
      }
      this.emitter.emit('members', this.members);
    });

    this.mesh.on('leaderChanged', (leaderId: string | null) => {
      console.debug(`[GameRoom] leaderChanged: ${leaderId} (my peerId: ${this.peerId})`);
      if (leaderId) {
        if (this.leaderDeferred) {
          this.leaderDeferred.resolve();
          this.leaderDeferred = null;
        }
      } else {
        // Leader lost (e.g., during Raft re-election after cluster merge).
        // Create a new deferred so waitForLeader blocks until a new leader is elected.
        if (!this.leaderDeferred) {
          this.leaderDeferred = new Deferred<void>();
        }
      }
    });

    this.mesh.on('message', (msg, replay) => {
      let gameEvent: GameEvent<T>;
      if (msg.type === 'public') {
        gameEvent = { type: 'public', sender: msg.sender, data: msg.data };
      } else {
        gameEvent = { type: 'private', sender: msg.sender, recipient: msg.recipient, data: msg.data };
      }
      console.debug(`[GameRoom] received ${msg.type} message from ${msg.sender}, replay=${replay}, dataType=${(msg.data as any)?.type}`);
      try {
        this.emitter.emit('event', gameEvent, msg.sender, replay);
      } catch (e) {
        console.error(`[GameRoom] ERROR in event handler for ${(msg.data as any)?.type}:`, e);
      }
    });
  }

  close() {
    this._status = 'Closed';
    this.emitter.emit('status', this._status);
    this.mesh.close();
  }

  get status() {
    return this._status;
  }

  get members() {
    return this.mesh.peers;
  }

  /**
   * Waits for the Raft leader to be elected before sending.
   * This ensures messages are not silently dropped during leader election.
   */
  private async waitForLeader(): Promise<void> {
    if (this.mesh.leaderId) return;
    if (this.leaderDeferred) {
      await this.leaderDeferred.promise;
    }
  }

  private async sendWithRetry(send: () => Promise<boolean>, label: string): Promise<void> {
    const MAX_RETRIES = 50;
    const RETRY_DELAY_MS = 200;
    for (let i = 0; i < MAX_RETRIES; i++) {
      await this.waitForLeader();
      console.debug(`sendWithRetry (${label}): calling send (attempt ${i + 1}/${MAX_RETRIES})...`);
      const result = await send();
      console.debug(`sendWithRetry (${label}): send returned ${result}`);
      if (result) return;
      if (i === 0 || i % 10 === 0) {
        console.debug(`emitEvent (${label}): send returned false (attempt ${i + 1}/${MAX_RETRIES}), leaderId=${this.mesh.leaderId}, peers=${this.mesh.peers.join(',')}`);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
    console.warn(`emitEvent (${label}): max retries exceeded, message may be lost.`);
  }

  async emitEvent(e: GameEvent<T>) {
    if (e.type === 'public') {
      await this.sendWithRetry(() => this.mesh.sendPublic(e.data), 'public');
    } else {
      await this.sendWithRetry(() => this.mesh.sendPrivate(e.recipient, e.data), `private→${e.recipient}`);
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
}
