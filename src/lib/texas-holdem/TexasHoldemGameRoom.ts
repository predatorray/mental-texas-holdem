import {GameEvent, GameRoomEvents, GameRoomStatus} from "../GameRoom";
import {
  MentalPokerGameRoomEvents,
  MentalPokerRoundSettings
} from "../MentalPokerGameRoom";
import EventEmitter from "eventemitter3";
import LifecycleManager from "../LifecycleManager";
import {EventListener} from "../types";
import {Board, CARDS, Flop, Hole, River, Turn} from "../rules";
import Deferred from "../Deferred";
import {StandardCard} from "mental-poker-toolkit";
import {evaluateCards, rankCards} from "phe";

export interface LastOneWins {
  how: 'LastOneWins',
  round: number,
  winner: string,
}

export interface ShowdownResult {
  how: 'Showdown',
  round: number,
  showdown: Array<{
    strength: number;
    handValue: number;
    players: string[];
  }>;
}

export type WinningResult =
  | LastOneWins
  | ShowdownResult;

export interface TexasHoldemGameRoomEvents {
  connected: (peerId: string) => void;
  status: (status: GameRoomStatus) => void;
  members: (members: string[]) => void;
  shuffled: () => void;

  players: (round: number, players: string[]) => void;
  board: (round: number, board: Board) => void;
  hole: (round: number, whose: string, hole: Hole) => void;
  bet: (round: number, amount: number, who: string) => void;
  fold: (round: number, who: string) => void;
  pot: (round: number, amount: number) => void;

  whoseTurn: (round: number, whose: string | null, actionMeta?: {callAmount: number}) => void;
  allSet: (round: number) => void;
  fund: (fund: number, whose: string) => void;
  winner: (result: WinningResult) => void;
}

export interface GameRoomLike<T> {
  peerIdAsync: Promise<string>;
  listener: EventListener<GameRoomEvents<GameEvent<T>>>;
  emitEvent: (e: GameEvent<T>) => Promise<void>;
}

export interface MentalPokerGameRoomLike {
  listener: EventListener<MentalPokerGameRoomEvents>;
  members: string[];
  startNewRound: (settings: MentalPokerRoundSettings) => Promise<number>;
  showCard: (round: number, cardOffset: number) => Promise<void>;
  dealCard: (round: number, cardOffset: number, recipient: string) => Promise<void>;
}

export interface TexasHoldemRoundSettings {
  bits?: number;
  initialFundAmount: number;
}

enum Stage {
  PRE_FLOP = 0,
  FLOP = 1,
  TURN = 2,
  RIVER = 3,
}

export interface NewRoundEvent {
  type: 'newRound';
  round: number;
  players: string[];
  settings: TexasHoldemRoundSettings;
}

export interface BetEvent {
  type: 'action/bet';
  round: number;
  amount: number;
}

export interface FoldEvent {
  type: 'action/fold';
  round: number;
}

export type TexasHoldemTableEvent =
  | NewRoundEvent
  | BetEvent
  | FoldEvent;

class TexasHoldemRound {
  playersOrdered: Deferred<string[]> = new Deferred();
  initialFunds: Deferred<Map<string, number>> = new Deferred();
  knownCards: Array<Deferred<StandardCard>> = new Array(CARDS).fill({}).map(() => new Deferred());

  pot: Map<string, number> = new Map();
  calledPlayers: Set<string> = new Set();
  foldPlayers: Set<string> = new Set();
  allInPlayers: Set<string> = new Set();

  stage: Stage = Stage.PRE_FLOP;
  result?: WinningResult = undefined;
}

export class TexasHoldemGameRoom {
  private readonly gameRoom: GameRoomLike<TexasHoldemTableEvent>;
  private readonly mentalPokerGameRoom: MentalPokerGameRoomLike;
  private readonly emitter = new EventEmitter<TexasHoldemGameRoomEvents>();

  private readonly lcm = new LifecycleManager();

  private round: number = 0;
  private dataByRounds: Map<number, TexasHoldemRound> = new Map();

  private funds: Map<string, number> = new Map();

  constructor(
    gameRoom: GameRoomLike<TexasHoldemTableEvent | any>,
    mentalPokerGameRoom: MentalPokerGameRoomLike,
  ) {
    this.gameRoom = gameRoom;
    this.mentalPokerGameRoom = mentalPokerGameRoom;

    this.propagate('connected');
    this.propagate('status');
    this.propagate('members');
    this.propagate('shuffled');

    // mental poker event listeners
    mentalPokerGameRoom.listener.on('card', this.lcm.register(async (round, offset, card) => {
      const roundData = this.getOrCreateDataForRound(round);
      roundData.knownCards[offset].resolve(card);
    }, listener => mentalPokerGameRoom.listener.off('card', listener)));

    // texas holdem event listeners
    this.gameRoom.listener.on('event', this.lcm.register(({ data }, who) => {
      switch (data.type) {
        case 'newRound':
          this.handleNewRoundEvent(data);
          break;
        case 'action/bet':
          this.handleBetEvent(data, who);
          break;
        case 'action/fold':
          this.handleFoldEvent(data, who);
          break;
      }
    }, listener => this.gameRoom.listener.off('event', listener)));
  }

  async startNewRound(settings: TexasHoldemRoundSettings) {
    const playersWithSufficientFund: string[] = this.mentalPokerGameRoom.members
      .filter(m => (this.funds.get(m) ?? settings.initialFundAmount) >= 2); // 1 BB (2 SB) at least
    if (playersWithSufficientFund.length < 2) {
      throw new Error('There should be at least 2 players to start a new round.');
    }

    const sbOffset = this.round % playersWithSufficientFund.length;
    const playersOrdered = [
      ...playersWithSufficientFund.slice(sbOffset),
      ...playersWithSufficientFund.slice(0, sbOffset),
    ];
    const sb = playersOrdered[0];
    const bb = playersOrdered[1];

    this.round = await this.mentalPokerGameRoom.startNewRound({
      alice: sb,
      bob: bb,
      bits: settings?.bits,
    });

    await this.gameRoom.emitEvent({
      type: 'public',
      sender: await this.gameRoom.peerIdAsync,
      data: {
        type: 'newRound',
        round: this.round,
        settings,
        players: playersOrdered,
      },
    });
  }

  async bet(round: number, amount: number) {
    await this.gameRoom.emitEvent({
      type: 'public',
      sender: await this.gameRoom.peerIdAsync,
      data: {
        type: 'action/bet',
        round,
        amount,
      },
    });
  }

  async fold(round: number) {
    await this.gameRoom.emitEvent({
      type: 'public',
      sender: await this.gameRoom.peerIdAsync,
      data: {
        type: 'action/fold',
        round,
      },
    });
  }

  get listener(): EventListener<TexasHoldemGameRoomEvents> {
    return this.emitter;
  }

  private propagate(eventName: (keyof (MentalPokerGameRoomEvents | TexasHoldemGameRoomEvents))) {
    this.mentalPokerGameRoom.listener.on(eventName, this.lcm.register((...args) => {
      this.emitter.emit(eventName, ...args);
    }, listener => this.mentalPokerGameRoom.listener.off(eventName, listener)));
  }

  private getOrCreateDataForRound(round: number): TexasHoldemRound {
    if (this.round < round) {
      this.round = round;
    }
    const existing = this.dataByRounds.get(round);
    if (existing) {
      return existing;
    }

    const roundData = new TexasHoldemRound();

    // bind events
    this.registerBoardEvents(round, roundData);

    // hole
    this.registerHoleEvents(round, roundData);

    // winner (for showdown)
    this.registerWinnerEvents(round, roundData);

    this.dataByRounds.set(round, roundData);
    return roundData;
  }

  private registerBoardEvents(round: number, roundData: TexasHoldemRound) {
    Promise.all(roundData.knownCards.slice(0, 3).map(d => d.promise)).then(flop => {
      roundData.stage = Stage.FLOP;
      this.emitter.emit('board', round, flop as Flop);
    });
    Promise.all(roundData.knownCards.slice(0, 4).map(d => d.promise)).then(turn => {
      roundData.stage = Stage.TURN;
      this.emitter.emit('board', round, turn as Turn);
    });
    Promise.all(roundData.knownCards.slice(0, 5).map(d => d.promise)).then(river => {
      roundData.stage = Stage.RIVER;
      this.emitter.emit('board', round, river as River);
    });
  }

  private registerHoleEvents(round: number, roundData: TexasHoldemRound) {
    for (let i = 5; (i + 1) < roundData.knownCards.length; i += 2) {
      Promise.all([
        roundData.knownCards[i].promise,
        roundData.knownCards[i + 1].promise,
        roundData.playersOrdered.promise,
      ]).then(([hole1, hole2, playersOrdered]) => {
        const hole: Hole = [hole1, hole2];
        const playerOffset = Math.floor((i - 5) / 2);
        if (playerOffset < playersOrdered.length) {
          this.emitter.emit('hole', round, playersOrdered[playerOffset], hole);
        }
      });
    }
  }

  private registerWinnerEvents(round: number, roundData: TexasHoldemRound) {
    roundData.playersOrdered.promise.then(players => {
      Promise.all(roundData.knownCards.slice(0, 5 + players.length * 2).map(d => d.promise)).then(cards => {
        const strengthOfPlayers: Array<{
          player: string;
          handValue: number;
          strength: number;
        }> = [];
        const board = cards.slice(0, 5);
        for (let playerOffset = 0; playerOffset < players.length; ++ playerOffset) {
          const holeOffsets = [
            playerOffset * 2 + 5,
            playerOffset * 2 + 6,
          ];
          const hole = [
            cards[holeOffsets[0]],
            cards[holeOffsets[1]],
          ];
          const holeAndBoard = [...hole, ...board];
          const sevenCardsEncoded = holeAndBoard.map(card => card.rank + card.suit.charAt(0).toLowerCase());
          const handValue = rankCards(sevenCardsEncoded);
          const strength = evaluateCards(sevenCardsEncoded);
          const player = players[playerOffset];
          strengthOfPlayers.push({
            player,
            handValue,
            strength,
          });
        }

        const result: ShowdownResult['showdown'] = [];
        for (const s of strengthOfPlayers.sort((s1, s2) => s1.strength - s2.strength)) {
          const last = result.length > 0 ? result[result.length - 1] : null;
          if (last && last.strength === s.strength) {
            last.players.push(s.player);
          } else {
            result.push({
              players: [s.player],
              handValue: s.handValue,
              strength: s.strength,
            });
          }
        }

        this.emitter.emit('winner', {
          how: 'Showdown',
          round,
          showdown: result,
        });

        const awards = this.calculateAwards(roundData, result);
        for (let [winner, award] of Array.from(awards.entries())) {
          const newFundOfWinner = (this.funds.get(winner) ?? 0) + award;
          this.updateFundOfPlayer(winner, newFundOfWinner);
        }
      });
    });
  }

  private calculateAwards(roundData: TexasHoldemRound, showdownResult: ShowdownResult['showdown']) {
    const pot = new Map(roundData.pot);
    const amountsToBeUpdated = new Map<string, number>();
    for (let result of showdownResult) {
      const winners = result.players.sort((p1, p2) => (pot.get(p1) ?? 0) - (pot.get(p2) ?? 0));
      let amountUnallocated: number = 0;
      for (let winnerOffset = 0; winnerOffset < winners.length; ++winnerOffset) {
        let winner = winners[winnerOffset];
        const betPortion = pot.get(winner) ?? 0;

        for (let [p, betAmount] of Array.from(pot.entries())) {
          const wonAmount = Math.min(betPortion, betAmount);
          amountUnallocated += wonAmount;
          const remaining = betAmount - wonAmount;
          if (remaining === 0) {
            pot.delete(p);
          } else {
            pot.set(p, remaining);
          }
        }

        const wonPortion = Math.floor(amountUnallocated / (winners.length - winnerOffset));
        amountUnallocated -= wonPortion;
        console.log(`Player ${winner} won ${wonPortion}.`);
        amountsToBeUpdated.set(winner, (amountsToBeUpdated.get(winner) ?? 0) + wonPortion);
      }
    }
    // remaining
    for (let [p, remaining] of Array.from(pot.entries())) {
      amountsToBeUpdated.set(p, (amountsToBeUpdated.get(p) ?? 0) + remaining);
    }
    // remove zero amount
    for (let [p, amount] of Array.from(amountsToBeUpdated)) {
      if (amount === 0) {
        amountsToBeUpdated.delete(p);
      }
    }
    return amountsToBeUpdated;
  }

  private async handleNewRoundEvent(e: NewRoundEvent) {
    for (let member of this.mentalPokerGameRoom.members) {
      if (!this.funds.has(member)) {
        this.updateFundOfPlayer(member, e.settings.initialFundAmount);
      }
    }

    const roundData = this.getOrCreateDataForRound(e.round);
    roundData.playersOrdered.resolve(e.players);
    this.emitter.emit('players', e.round, e.players);
    roundData.initialFunds.resolve(new Map(this.funds));

    // [0] to [4] are the board cards, hole cards start from [5]
    for (let i = 0; i < e.players.length; ++i) {
      const holeOffsets = [
        i * 2 + 5,
        i * 2 + 6,
      ];

      await this.mentalPokerGameRoom.dealCard(e.round, holeOffsets[0], e.players[i]);
      await this.mentalPokerGameRoom.dealCard(e.round, holeOffsets[1], e.players[i]);
    }

    await this.handleBet(e.round, 1, e.players[0], true); // sb bets 1
    await this.handleBet(e.round, 2, e.players[1], true); // bb bets 2

    const playerNextToBb = e.players[2 % e.players.length];
    this.emitter.emit('whoseTurn', e.round, playerNextToBb, {callAmount: e.players.length === 2 ? 1 : 2});
  }

  private async handleBetEvent(e: BetEvent, who: string) {
    await this.handleBet(e.round, e.amount, who);
  }

  private async handleBet(roundNo: number, raisedAmount: number, who: string, isSbBbFirstBet?: boolean) {
    if (raisedAmount < 0) {
      console.warn(`Bet amount cannot be negative: ${raisedAmount}`);
      return;
    }

    const fund = this.funds.get(who) ?? 0;
    if (fund < raisedAmount) {
      console.warn(`Fund is insufficient: ${fund}`);
      return;
    }

    const round = this.getOrCreateDataForRound(roundNo);
    if (round.result) {
      console.warn(`Cannot bet since this round has ended.`);
      return;
    }
    const pot = round.pot;
    const currentBetAmount = pot.get(who) ?? 0;
    const leastTotalBetAmount = Array.from(pot.values()).reduce((a, b) => Math.max(a, b), 0);
    const totalBetAmount = currentBetAmount + raisedAmount;
    if (totalBetAmount < leastTotalBetAmount && fund !== raisedAmount) { // if less but not all-in
      console.warn(`Cannot bet ${raisedAmount} addition to ${currentBetAmount} because the least bet amount is ${leastTotalBetAmount}.`);
      return;
    }

    if (!isSbBbFirstBet) {
      if (totalBetAmount === leastTotalBetAmount) {
        // call or check
        round.calledPlayers.add(who);
      } else {
        // raise
        round.calledPlayers.clear();
        round.calledPlayers.add(who);
      }
    }

    if (fund === raisedAmount) {
      round.allInPlayers.add(who);
    }

    pot.set(who, totalBetAmount);
    this.updateFundOfPlayer(who, fund - raisedAmount);

    this.emitter.emit('bet', roundNo, raisedAmount, who);
    const potTotalAmount = Array.from(round.pot.values()).reduce((a, b) => a + b, 0);
    this.emitter.emit('pot', roundNo, potTotalAmount);

    if (!isSbBbFirstBet) {
      await this.continueUnlessAllSet(roundNo, round);
    }
  }

  private async handleFoldEvent(e: FoldEvent, who: string) {
    const round = this.getOrCreateDataForRound(e.round);
    if (round.result) {
      return;
    }
    round.foldPlayers.add(who);
    this.emitter.emit('fold', e.round, who);

    const playersLeft = (await round.playersOrdered.promise).filter(p => !round.foldPlayers.has(p));
    if (playersLeft.length === 1) {
      // last one wins
      const winner = playersLeft[0];
      const result: LastOneWins = {
        how: 'LastOneWins',
        round: e.round,
        winner,
      };
      round.result = result;
      this.emitter.emit('winner', result);
      const totalPotAmount = Array.from(round.pot.values()).reduce((m1, m2) => m1 + m2, 0);
      const newFundOfWinner = (this.funds.get(winner) ?? 0) + totalPotAmount;
      this.updateFundOfPlayer(winner, newFundOfWinner);
    } else {
      await this.continueUnlessAllSet(e.round, round);
    }
  }

  private updateFundOfPlayer(whose: string, amount: number) {
    this.funds.set(whose, amount);
    this.emitter.emit('fund', amount, whose);
  }

  private async continueUnlessAllSet(round: number, roundData: TexasHoldemRound) {
    const players = await roundData.playersOrdered.promise;

    const playersNotCalled = players.filter(player =>
      !roundData.allInPlayers.has(player) &&
      !roundData.calledPlayers.has(player) &&
      !roundData.foldPlayers.has(player));

    if (playersNotCalled.length === 0) {
      roundData.calledPlayers.clear();
      this.emitter.emit('allSet', round);
      this.emitter.emit('whoseTurn', round, null);

      const cardOffsetsToShow: number[] = (() => {
        switch (roundData.stage) {
          case Stage.PRE_FLOP:
            return [0, 1, 2];
          case Stage.FLOP:
            return [3];
          case Stage.TURN:
            return [4];
          case Stage.RIVER:
            return [];
        }
      })();

      for (let cardOffset of cardOffsetsToShow) {
        await this.mentalPokerGameRoom.showCard(round, cardOffset);
      }

      if (roundData.stage === Stage.RIVER) {
        await this.showdown(round, roundData);
      } else {
        // FIXME: if everyone else is all-in, show all the community cards
        this.emitter.emit('whoseTurn', round, players[0], {callAmount: 0});
      }
    } else {
      const playerNextToTheLastOneWhoCalled: string = (() => {
        // loop at most twice the array to avoid dead loop
        let lastOneWhoCalled: string | undefined = undefined;
        for (let i = 0; i < players.length * 2; ++i) {
          const player = players[i % players.length];
          if (roundData.allInPlayers.has(player) || roundData.foldPlayers.has(player)) {
            continue; // ignore those who are all-in or folded
          }

          if (roundData.calledPlayers.has(player)) {
            lastOneWhoCalled = player;
          } else if (lastOneWhoCalled) {
            return player;
          }
        }
        throw new Error('unreachable'); // FIXME: if everyone else is all-in
      })();

      const pot = roundData.pot;
      const currentBetAmount = pot.get(playerNextToTheLastOneWhoCalled) ?? 0;
      const leastTotalBetAmount = Array.from(pot.values()).reduce((a, b) => Math.max(a, b), 0);
      const callAmount = leastTotalBetAmount - currentBetAmount;
      this.emitter.emit('whoseTurn', round, playerNextToTheLastOneWhoCalled, {callAmount});
    }
  }

  private async showdown(round: number, roundData: TexasHoldemRound) {
    const playerCount = (await roundData.playersOrdered.promise).length;
    for (let i = 0; i < playerCount; ++i) {
      const holeOffsets = [
        i * 2 + 5,
        i * 2 + 6,
      ];
      await this.mentalPokerGameRoom.showCard(round, holeOffsets[0]);
      await this.mentalPokerGameRoom.showCard(round, holeOffsets[1]);
    }
  }
}
