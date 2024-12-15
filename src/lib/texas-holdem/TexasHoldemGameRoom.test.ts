import { GameRoomEvents, GameEvent } from "../GameRoom";
import {
  GameRoomLike,
  MentalPokerGameRoomLike,
  TexasHoldemGameRoom,
  TexasHoldemGameRoomEvents,
  TexasHoldemTableEvent
} from "./TexasHoldemGameRoom";
import Deferred from "../Deferred";
import EventEmitter from "eventemitter3";
import { MentalPokerGameRoomEvents, MentalPokerRoundSettings } from "../MentalPokerGameRoom";

class MockGameRoom implements GameRoomLike<TexasHoldemTableEvent> {
  peerIdAsync: Promise<string>;
  peerIdDeferred = new Deferred<string>();

  eventsEmitted: Array<GameEvent<TexasHoldemTableEvent>> = [];

  listener = new EventEmitter<GameRoomEvents<GameEvent<TexasHoldemTableEvent>>>();

  private paired: Set<MockGameRoom> = new Set();

  constructor() {
    this.peerIdAsync = this.peerIdDeferred.promise;
  }

  async emitEvent(e: GameEvent<TexasHoldemTableEvent>) {
    const myPeerId = await this.peerIdAsync;
    this.eventsEmitted.push(e);
    this.listener.emit('event', e, myPeerId);

    for (let eachPaired of Array.from(this.paired)) {
      if (e.type === 'public' || e.recipient === await eachPaired.peerIdAsync) {
        eachPaired.listener.emit('event', e, myPeerId);
      }
    }
  }

  get lastEventEmitted() {
    return this.eventsEmitted[this.eventsEmitted.length - 1];
  }

  pair(another: MockGameRoom) {
    if (this === another) {
      return;
    }
    this.paired.add(another);
    another.paired.add(this);
  }
}

class MockMentalPokerGameRoom implements MentalPokerGameRoomLike {
  round: number = 0;
  listener = new EventEmitter<MentalPokerGameRoomEvents>();
  members: string[] = [];

  shownCards: Parameters<typeof this.showCard>[] = [];
  dealtCards: Parameters<typeof this.dealCard>[] = [];

  async startNewRound(settings: MentalPokerRoundSettings) {
    return ++this.round;
  }

  async showCard(round: number, cardOffset: number): Promise<void> {
    this.shownCards.push([round, cardOffset]);
  }

  async dealCard(round: number, cardOffset: number, recipient: string): Promise<void> {
    this.dealtCards.push([round, cardOffset, recipient]);
  }
}

describe('TexasHoldemGameRoom', () => {
  test('new round cannot be started when there is only one player', async () => {
    const gameRoom = new MockGameRoom();
    const mentalPokerGameRoom = new MockMentalPokerGameRoom();
    mentalPokerGameRoom.members = ['A'];
    const texasHoldemGameRoom = new TexasHoldemGameRoom(gameRoom, mentalPokerGameRoom);

    await expect(async () => {
      await texasHoldemGameRoom.startNewRound({
        initialFundAmount: 100,
      });
    }).rejects.toBeTruthy();
  });

  test('a new round is started', async () => {
    const mockGameRoom = new MockGameRoom();
    mockGameRoom.peerIdDeferred.resolve('A');
    const mockMentalPokerGameRoom = new MockMentalPokerGameRoom();
    mockMentalPokerGameRoom.members = ['A', 'B'];

    const texasHoldemGameRoom = new TexasHoldemGameRoom(mockGameRoom, mockMentalPokerGameRoom);

    const roundAndPlayersPromise = new Promise<{round: number; players: string[];}>(resolve => {
      texasHoldemGameRoom.listener.on('players', (round, players) => {
        resolve({round, players});
      });
    });
    const fundOfAPromise = new Promise<number>(resolve => {
      texasHoldemGameRoom.listener.on('fund', (fund, previousFund, whose) => {
        if (whose === 'A') {
          resolve(fund);
        }
      });
    });
    const fundOfBPromise = new Promise<number>(resolve => {
      texasHoldemGameRoom.listener.on('fund', (fund, previousFund, whose) => {
        if (whose === 'B') {
          resolve(fund);
        }
      });
    });
    const betOfAPromise = new Promise<number>(resolve => {
      texasHoldemGameRoom.listener.on('bet', (round, amount, who) => {
        if (round === 1 && who === 'A') {
          resolve(amount);
        }
      });
    });

    await texasHoldemGameRoom.startNewRound({
      initialFundAmount: 100,
    });

    expect(mockGameRoom.lastEventEmitted).toMatchObject({
      type: 'public',
      sender: 'A',
      data: {
        type: 'newRound',
        round: 1,
        settings: {
          initialFundAmount: 100,
        },
        players: ['A', 'B'],
      },
    });

    const {round, players} = await roundAndPlayersPromise;
    expect(round).toBe(1);
    expect(players).toEqual(['A', 'B']);

    const fundOfA = await fundOfAPromise;
    expect(fundOfA).toBe(100);
    const fundOfB = await fundOfBPromise;
    expect(fundOfB).toBe(100);

    const betOfA = await betOfAPromise;
    expect(betOfA).toBe(1);

    expect(mockMentalPokerGameRoom.shownCards).toEqual([]);
    expect(mockMentalPokerGameRoom.dealtCards).toEqual([
      [1, 5, 'A'],
      [1, 6, 'A'],
      [1, 7, 'B'],
      [1, 8, 'B'],
    ]);
  });
});

describe('TexasHoldemGameRoom with multiple players', () => {
  const testHostAndGuest = async (
    name: string,
    fn: (
      args: {
        hostGameRoom: MockGameRoom;
        hostMentalPokerGameRoom: MockMentalPokerGameRoom;
        hostTexasHoldemGameRoom: TexasHoldemGameRoom;
        guestGameRoom: MockGameRoom;
        guestMentalPokerGameRoom: MockMentalPokerGameRoom;
        guestTexasHoldemGameRoom: TexasHoldemGameRoom;
        guestGameRooms: MockGameRoom[];
        guestMentalPokerGameRooms: MockMentalPokerGameRoom[];
        guestTexasHoldemGameRooms: TexasHoldemGameRoom[];
      }
    ) => Promise<unknown>,
    options?: {
      guests?: number;
      hostId?: string;
      guestIds?: string[];
    }
  ) => {
    test(name, async () => {
      const members: string[] = [];
      const hostGameRoom = new MockGameRoom();
      const hostId = options?.hostId ?? 'host';
      members.push(hostId);
      hostGameRoom.peerIdDeferred.resolve(hostId);
      const hostMentalPokerGameRoom = new MockMentalPokerGameRoom();
      const hostTexasHoldemGameRoom = new TexasHoldemGameRoom(hostGameRoom, hostMentalPokerGameRoom);

      const guestGameRooms: MockGameRoom[] = [];
      const guestMentalPokerGameRooms: MockMentalPokerGameRoom[] = [];
      const guestTexasHoldemGameRooms: TexasHoldemGameRoom[] = [];

      for (let i = 0; i < (options?.guests ?? 1); i++) {
        const guestGameRoom = new MockGameRoom();
        const guestId = options?.guestIds?.[i] ?? `guest${i}`;
        members.push(guestId);
        guestGameRoom.peerIdDeferred.resolve(guestId);
        guestGameRoom.pair(hostGameRoom);
        for (let existGameRoom of guestGameRooms) {
          guestGameRoom.pair(existGameRoom);
        }
        guestGameRooms.push(guestGameRoom);

        const guestMentalPokerGameRoom = new MockMentalPokerGameRoom();
        guestMentalPokerGameRooms.push(guestMentalPokerGameRoom);

        guestTexasHoldemGameRooms.push(new TexasHoldemGameRoom(guestGameRoom, guestMentalPokerGameRoom));
      }

      for (let mentalPokerGameRoom of [hostMentalPokerGameRoom, ...guestMentalPokerGameRooms]) {
        mentalPokerGameRoom.members = [...members];
      }

      await fn({
        hostGameRoom,
        hostMentalPokerGameRoom,
        hostTexasHoldemGameRoom,
        guestGameRoom: guestGameRooms[0],
        guestMentalPokerGameRoom: guestMentalPokerGameRooms[0],
        guestTexasHoldemGameRoom: guestTexasHoldemGameRooms[0],
        guestGameRooms,
        guestMentalPokerGameRooms,
        guestTexasHoldemGameRooms,
      });

      guestTexasHoldemGameRooms.forEach(room => room.close());
      hostTexasHoldemGameRoom.close();
    });
  };

  const listenOnce = <E extends (keyof TexasHoldemGameRoomEvents)>(texasHoldem: TexasHoldemGameRoom, eventName: E): Promise<EventEmitter.ArgumentMap<TexasHoldemGameRoomEvents>[Extract<E, keyof TexasHoldemGameRoomEvents>]> => {
    return new Promise(resolve => {
      texasHoldem.listener.once(eventName, (...args) => {
        resolve(args);
      });
    });
  };

  const subscribeEvents = <E extends (keyof TexasHoldemGameRoomEvents)>(texasHoldem: TexasHoldemGameRoom, eventName: E) => {
    let eventsSinceLastPop: EventEmitter.ArgumentMap<TexasHoldemGameRoomEvents>[Extract<E, keyof TexasHoldemGameRoomEvents>][] = [];
    texasHoldem.listener.on(eventName, (...args) => {
      eventsSinceLastPop.push([...args]);
    });

    const pop = () => {
      const popped = [...eventsSinceLastPop];
      eventsSinceLastPop = [];
      return popped;
    };

    return {
      pop,
    };
  };

  testHostAndGuest('happy path', async (
    {
      hostMentalPokerGameRoom,
      hostTexasHoldemGameRoom,
      guestMentalPokerGameRoom,
      guestTexasHoldemGameRoom,
    }
  ) => {
    const playerEventReceivedPromise = listenOnce(hostTexasHoldemGameRoom, 'players');
    const betEventsSubscriber = subscribeEvents(hostTexasHoldemGameRoom, 'bet');
    const whoseTurnEventsSubscriber = subscribeEvents(hostTexasHoldemGameRoom, 'whoseTurn');

    await hostTexasHoldemGameRoom.startNewRound({
      initialFundAmount: 100,
    });

    const [round, players] = await playerEventReceivedPromise;
    expect(round).toEqual(1);
    expect(players).toEqual(['host', 'guest0']);

    // expect the hole cards are dealt to the correct player
    for (let mentalPokerGameRoom of [hostMentalPokerGameRoom, guestMentalPokerGameRoom]) {
      expect(mentalPokerGameRoom.dealtCards[0]).toEqual([1, 5, 'host']);
      expect(mentalPokerGameRoom.dealtCards[1]).toEqual([1, 6, 'host']);
      expect(mentalPokerGameRoom.dealtCards[2]).toEqual([1, 7, 'guest0']);
      expect(mentalPokerGameRoom.dealtCards[3]).toEqual([1, 8, 'guest0']);
    }

    const holeEventReceivedByHostPromise = listenOnce(hostTexasHoldemGameRoom, 'hole');
    const holeEventReceivedByGuestPromise = listenOnce(guestTexasHoldemGameRoom, 'hole');

    // emit the card events accordingly
    hostMentalPokerGameRoom.listener.emit('card', 1, 5, { suit: 'Club', rank: '2' });
    hostMentalPokerGameRoom.listener.emit('card', 1, 6, { suit: 'Club', rank: '3' });
    guestMentalPokerGameRoom.listener.emit('card', 1, 7, { suit: 'Diamond', rank: '2'});
    guestMentalPokerGameRoom.listener.emit('card', 1, 8, { suit: 'Diamond', rank: '3'});

    // "hole" events should have been received
    const holeEventReceivedByHost = await holeEventReceivedByHostPromise;
    expect(holeEventReceivedByHost).toEqual([1, 'host', [{ suit: 'Club', rank: '2' }, { suit: 'Club', rank: '3' }]]);
    const holeEventReceivedByGuest = await holeEventReceivedByGuestPromise;
    expect(holeEventReceivedByGuest).toEqual([1, 'guest0', [{ suit: 'Diamond', rank: '2' }, { suit: 'Diamond', rank: '3' }]]);

    // 1 for SB, 2 for BB should have been received
    const betEvents = betEventsSubscriber.pop();
    expect(betEvents).toEqual([
      [1, 1, 'host', false],
      [1, 2, 'guest0', false],
    ]);

    const whoseTurnEvents = whoseTurnEventsSubscriber.pop();
    expect(whoseTurnEvents).toEqual([
      [1, 'host', { callAmount: 1 }],
    ]);
  });
});
