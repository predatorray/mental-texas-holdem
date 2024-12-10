import {EventListener} from "./types";
import {GameEvent, GameRoomEvents} from "./GameRoom";
import EventEmitter from "eventemitter3";
import LifecycleManager from "./LifecycleManager";

export interface TextMessageEvent {
  type: 'text';
  text: string;
}

export type ChatRoomEvent =
  | TextMessageEvent;

export interface ChatRoomEvents {
  text: (text: string, fromWhom: string) => void;
}

export interface GameRoomLike<T> {
  listener: EventListener<GameRoomEvents<GameEvent<T>>>;
  peerIdAsync: Promise<string>;
  emitEvent: (e: GameEvent<T>) => Promise<void>;
  close: () => void;
}

export default class ChatRoom {
  private readonly gameRoom: GameRoomLike<ChatRoomEvent>;
  private readonly emitter = new EventEmitter<ChatRoomEvents>();
  private readonly lcm = new LifecycleManager();

  constructor(gameRoom: GameRoomLike<ChatRoomEvent | any>) {
    this.gameRoom = gameRoom;

    this.gameRoom.listener.on('event', this.lcm.register(({data}, whom) => {
      switch (data.type) {
        case 'text':
          this.emitter.emit('text', data.text, whom);
          break;
      }
    }, listener => this.gameRoom.listener.off('event', listener)));
  }

  async sendTextMessage(text: string, recipient?: string) {
    if (recipient) {
      await this.gameRoom.emitEvent({
        type: 'private',
        sender: await this.gameRoom.peerIdAsync,
        recipient,
        data: {
          type: 'text',
          text,
        },
      });
    } else {
      await this.gameRoom.emitEvent({
        type: 'public',
        sender: await this.gameRoom.peerIdAsync,
        data: {
          type: 'text',
          text,
        },
      });
    }
  }

  close() {
    this.gameRoom.close();
  }

  get listener(): EventListener<ChatRoomEvents> {
    return this.emitter;
  }
}
