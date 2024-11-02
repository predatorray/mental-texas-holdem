import { GameRoomEvents, GameEvent } from "./GameRoom";
import MentalPokerGameRoom, {GameRoomLike, MentalPokerEvent} from "./MentalPokerGameRoom";
import EventEmitter from "eventemitter3";
import Deferred from "./Deferred";
import {StandardCard} from "mental-poker-toolkit";

class MockGameRoom implements GameRoomLike<MentalPokerEvent> {
  listener = new EventEmitter<GameRoomEvents<GameEvent<MentalPokerEvent>>>();
  peerIdAsync: Promise<string>;
  peerIdDeferred = new Deferred<string>();

  eventsEmitted: Array<GameEvent<MentalPokerEvent>> = [];

  private paired?: MockGameRoom;

  constructor() {
    this.peerIdAsync = this.peerIdDeferred.promise;
  }

  async emitEvent(e: GameEvent<MentalPokerEvent>) {
    const myPeerId = await this.peerIdAsync;
    this.eventsEmitted.push(e);
    this.listener.emit('event', e, myPeerId);
    if (this.paired) {
      if (e.type === 'public' || e.recipient === await this.paired.peerIdAsync) {
        this.paired.listener.emit('event', e, myPeerId);
      }
    }
  }

  get lastEventEmitted() {
    return this.eventsEmitted[this.eventsEmitted.length - 1];
  }

  pair(another: MockGameRoom) {
    this.paired = another;
    another.paired = this;
  }
}

describe('MentalPokerGameRoom', () => {
  test('first round starts with one', async () => {
    const mockGameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MentalPokerGameRoom(mockGameRoom);

    mockGameRoom.peerIdDeferred.resolve('myid');

    const firstRound = await mentalPokerGameRoom.startNewRound({
      alice: 'alice',
      bob: 'bob',
    });
    expect(firstRound).toBe(1);
  });

  test('seconds round is two', async () => {
    const mockGameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MentalPokerGameRoom(mockGameRoom);

    mockGameRoom.peerIdDeferred.resolve('myid');

    await mentalPokerGameRoom.startNewRound({
      alice: 'alice',
      bob: 'bob',
    });
    const secondRound = await mentalPokerGameRoom.startNewRound({
      alice: 'alice',
      bob: 'bob',
    });
    expect(secondRound).toBe(2);
  });

  test('start event is emitted', async () => {
    const mockGameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MentalPokerGameRoom(mockGameRoom);

    mockGameRoom.peerIdDeferred.resolve('myid');

    const round = await mentalPokerGameRoom.startNewRound({
      alice: 'alice',
      bob: 'bob',
    });

    expect(mockGameRoom.lastEventEmitted).toMatchObject({
      type: 'public',
      sender: 'myid',
      data: {
        type: 'start',
        round,
        mentalPokerSettings: {
          alice: 'alice',
          bob: 'bob',
        },
      },
    });
  });

  test('deck is shuffled', async () => {
    const mockGameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MentalPokerGameRoom(mockGameRoom);

    mockGameRoom.peerIdDeferred.resolve('myid');

    await mentalPokerGameRoom.startNewRound({
      alice: 'myid',
      bob: 'myid',
    });

    await new Promise(resolve => {
      mentalPokerGameRoom.listener.on('shuffled', () => resolve(undefined));
    });
  }, 30000);

  test('showing cards to oneself', async () => {
    const mockGameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MentalPokerGameRoom(mockGameRoom);

    mockGameRoom.peerIdDeferred.resolve('myid');

    const round = await mentalPokerGameRoom.startNewRound({
      alice: 'myid',
      bob: 'myid',
    });

    await new Promise(resolve => {
      mentalPokerGameRoom.listener.on('shuffled', () => resolve(undefined));
    });

    const cardShownEventPromise: Promise<[
      number,
      number,
      StandardCard,
    ]> = new Promise(resolve => {
      mentalPokerGameRoom.listener.on('card', (round, offset, card) => resolve([round, offset, card]));
    });

    await mentalPokerGameRoom.showCard(round, 0);

    const cardShownEvent = await cardShownEventPromise;

    expect(cardShownEvent[0]).toBe(round);
    expect(cardShownEvent[1]).toBe(0);

    const cardShown = cardShownEvent[2];
    expect(cardShown.suit).toBeTruthy();
    expect(cardShown.rank).toBeTruthy();
  }, 30000);

  test('dealing and showing card between two participants', async () => {
    const mockGameRoom = [
      new MockGameRoom(),
      new MockGameRoom()
    ];
    mockGameRoom[0].pair(mockGameRoom[1]);

    const mentalPokerGameRoom = [
      new MentalPokerGameRoom(mockGameRoom[0]),
      new MentalPokerGameRoom(mockGameRoom[1]),
    ];

    mockGameRoom[0].peerIdDeferred.resolve('a');
    mockGameRoom[1].peerIdDeferred.resolve('b');

    // assert both participants have received the shuffled deck
    const shuffledDeckReceived = [
      new Promise(resolve => {
        mentalPokerGameRoom[0].listener.on('shuffled', () => resolve(undefined));
      }),
      new Promise(resolve => {
        mentalPokerGameRoom[1].listener.on('shuffled', () => resolve(undefined));
      }),
    ];

    const round = await mentalPokerGameRoom[0].startNewRound({
      alice: 'a',
      bob: 'b',
    });

    await shuffledDeckReceived[0];
    await shuffledDeckReceived[1];

    // deal cards
    let cardOffsetDealtPromises: Promise<number>[] = [
      new Promise(resolve => {
        mentalPokerGameRoom[0].listener.on('card', (_round, offset, card) => resolve(offset));
      }),
      new Promise(resolve => {
        mentalPokerGameRoom[1].listener.on('card', (_round, offset, card) => resolve(offset));
      }),
    ];

    await mentalPokerGameRoom[0].dealCard(round, 0, 'a');
    await mentalPokerGameRoom[1].dealCard(round, 0, 'a');

    await mentalPokerGameRoom[0].dealCard(round, 1, 'b');
    await mentalPokerGameRoom[1].dealCard(round, 1, 'b');

    const cardOffsetsDealt = [
      await cardOffsetDealtPromises[0],
      await cardOffsetDealtPromises[1],
    ];

    expect(cardOffsetsDealt[0]).toBe(0);
    expect(cardOffsetsDealt[1]).toBe(1);

    // show cards
    const cardOffsetShownPromises: Promise<number>[] = [
      new Promise(resolve => {
        mentalPokerGameRoom[0].listener.on('card', (_round, offset, card) => resolve(offset));
      }),
      new Promise(resolve => {
        mentalPokerGameRoom[1].listener.on('card', (_round, offset, card) => resolve(offset));
      }),
    ];

    await mentalPokerGameRoom[0].showCard(round, 2);
    await mentalPokerGameRoom[1].showCard(round, 2);

    const cardOffsetsShown = [
      await cardOffsetShownPromises[0],
      await cardOffsetShownPromises[1],
    ];

    expect(cardOffsetsShown[0]).toBe(2);
    expect(cardOffsetsShown[1]).toBe(2);
  }, 60000);
});
