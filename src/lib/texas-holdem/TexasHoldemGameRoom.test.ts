import { GameRoomEvents, GameEvent } from "../GameRoom";
import {GameRoomLike, MentalPokerGameRoomLike, TexasHoldemGameRoom, TexasHoldemTableEvent} from "./TexasHoldemGameRoom";
import Deferred from "../Deferred";
import EventEmitter from "eventemitter3";
import { MentalPokerGameRoomEvents, MentalPokerRoundSettings } from "../MentalPokerGameRoom";

class MockGameRoom implements GameRoomLike<TexasHoldemTableEvent> {
  peerIdAsync: Promise<string>;
  peerIdDeferred = new Deferred<string>();

  eventsEmitted: Array<GameEvent<TexasHoldemTableEvent>> = [];

  listener = new EventEmitter<GameRoomEvents<GameEvent<TexasHoldemTableEvent>>>();

  private paired?: MockGameRoom;

  constructor() {
    this.peerIdAsync = this.peerIdDeferred.promise;
  }

  async emitEvent(e: GameEvent<TexasHoldemTableEvent>) {
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
