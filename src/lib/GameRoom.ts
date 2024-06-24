import EventEmitter from "eventemitter3";
import Peer, { DataConnection } from "peerjs";

export interface PlayerJoinedEvent {
  playerId: string;
  metadata: any;
}

export interface PlayerLeftMessage {
  playerId: string;
}

export interface DefaultEventTypes {
  connected: (playerId: string) => void;
  joined: (e: PlayerJoinedEvent) => void;
  left: (e: PlayerLeftMessage) => void;
}

export abstract class GameRoom {
}

export class HostGameRoom extends GameRoom {

  private hostPeer: Peer;

  constructor(hostPeer: Peer) {
    super();
    this.hostPeer = hostPeer;
    
    this.hostPeer.on('connection', guestConnection => {
      // TODO
    });
  }
}

export class GuestGameRoom extends GameRoom {

  private guestPeer: Peer;
  private hostConnection: DataConnection;

  constructor(guestPeer: Peer, hostConnection: DataConnection) {
    super();
    this.guestPeer = guestPeer;
    this.hostConnection = hostConnection;
  }
}

export interface GameRoomOptions {
  roomId: string;
}

export async function hostOrJoinGameRoom(options: GameRoomOptions): Promise<GameRoom> {
  return new Promise((resolve, reject) => {
    const host = new Peer(options.roomId);
    host.on('open', () => {
      resolve(new HostGameRoom(host));
    });
    host.on('error', error => {
      if (error.type === 'unavailable-id') {
        const guest = new Peer();
        const connectionToHost = guest.connect(options.roomId);
        connectionToHost.on('open', () => {
          resolve(new GuestGameRoom(guest, connectionToHost));
        });
        connectionToHost.on('error', error => {
          reject(error);
        });
      } else {
        reject(error);
      }
    });
  });
}
