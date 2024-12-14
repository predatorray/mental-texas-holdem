import { GameRoomEvents, GameEvent } from "./GameRoom";
import EventEmitter from "eventemitter3";
import ChatRoom, {ChatRoomEvent, ChatRoomEvents, GameRoomLike} from "./ChatRoom";
import Deferred from "./Deferred";

class MockGameRoom implements GameRoomLike<ChatRoomEvent> {
  listener = new EventEmitter<GameRoomEvents<GameEvent<ChatRoomEvent>>>();
  peerIdAsync: Promise<string>;
  peerIdDeferred = new Deferred<string>();
  members: string[] = [];

  eventsEmitted: Array<GameEvent<ChatRoomEvent>> = [];

  private paired?: MockGameRoom;

  constructor() {
    this.peerIdAsync = this.peerIdDeferred.promise;
  }

  async emitEvent(e: GameEvent<ChatRoomEvent>) {
    const myPeerId = await this.peerIdAsync;
    this.eventsEmitted.push(e);
    this.listener.emit('event', e, myPeerId);
    if (this.paired) {
      if (e.type === 'public' || e.recipient === await this.paired.peerIdAsync) {
        this.paired.listener.emit('event', e, myPeerId);
      }
    }
  }

  pair(another: MockGameRoom) {
    this.paired = another;
    another.paired = this;
  }

  close() {
  }
}

describe('ChatRoom', () => {
  const testHostAndGuest = (
    name: string,
    fn: (
      args: {
        hostGameRoom: MockGameRoom;
        hostChatRoom: ChatRoom;
        guestGameRoom: MockGameRoom;
        guestChatRoom: ChatRoom;
      }
    ) => Promise<unknown>,
    options?: {
      hostId?: string;
      guestId?: string;
    },
  ) => {
    test(name, async () => {
      const hostGameRoom = new MockGameRoom();
      const hostChatRoom = new ChatRoom(hostGameRoom);
      hostGameRoom.peerIdDeferred.resolve(options?.hostId ?? 'hostid');

      const guestGameRoom = new MockGameRoom();
      const guestChatRoom = new ChatRoom(guestGameRoom);
      guestGameRoom.peerIdDeferred.resolve(options?.guestId ?? 'guestid');

      hostGameRoom.pair(guestGameRoom);

      await fn({
        hostGameRoom,
        hostChatRoom,
        guestGameRoom,
        guestChatRoom,
      });

      hostChatRoom.close();
      guestChatRoom.close();
    });
  };

  const listenOnce = <E extends (keyof ChatRoomEvents)>(chatRoom: ChatRoom, eventName: E): Promise<EventEmitter.ArgumentMap<ChatRoomEvents>[Extract<E, keyof ChatRoomEvents>]> => {
    return new Promise(resolve => {
      chatRoom.listener.once(eventName, (...args) => {
        resolve(args);
      });
    });
  };

  testHostAndGuest('setting names', async ({hostChatRoom, guestChatRoom}) => {
    let nameReceivedByHostPromise = listenOnce(hostChatRoom, 'name');
    let nameReceivedByGuestPromise = listenOnce(guestChatRoom, 'name');
    await hostChatRoom.setMyName('Alice');

    expect(await nameReceivedByHostPromise).toEqual(['Alice', 'hostid']);
    expect(await nameReceivedByGuestPromise).toEqual(['Alice', 'hostid']);

    nameReceivedByHostPromise = listenOnce(hostChatRoom, 'name');
    nameReceivedByGuestPromise = listenOnce(guestChatRoom, 'name');
    await guestChatRoom.setMyName('Bob');

    expect(await nameReceivedByHostPromise).toEqual(['Bob', 'guestid']);
    expect(await nameReceivedByGuestPromise).toEqual(['Bob', 'guestid']);
  });

  testHostAndGuest('sending text messages', async ({hostChatRoom, guestChatRoom}) => {
    let textReceivedByHostPromise = listenOnce(hostChatRoom, 'text');
    let textReceivedByGuestPromise = listenOnce(guestChatRoom, 'text');
    await hostChatRoom.sendTextMessage('text1');

    expect(await textReceivedByHostPromise).toEqual(['text1', 'hostid']);
    expect(await textReceivedByGuestPromise).toEqual(['text1', 'hostid']);

    textReceivedByHostPromise = listenOnce(hostChatRoom, 'text');
    textReceivedByGuestPromise = listenOnce(guestChatRoom, 'text');
    await guestChatRoom.sendTextMessage('text2');

    expect(await textReceivedByHostPromise).toEqual(['text2', 'guestid']);
    expect(await textReceivedByGuestPromise).toEqual(['text2', 'guestid']);
  });
});
