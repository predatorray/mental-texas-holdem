import EventEmitter from "eventemitter3";
import {TexasHoldemGameRoomEvents, WinningResult} from "./TexasHoldemGameRoom";
import {StandardCard} from "mental-poker-toolkit";
import {Hole} from "../rules";

import {renderHook, act} from "@testing-library/react";
import useTexasHoldem from "./useTexasHoldem";
import {TexasHoldem} from "../setup";

jest.mock('../setup');

// The mock at __mocks__/setup.ts provides an EventEmitter-based stub.
// We need emit(), so cast the listener and add the missing methods.
const emitter = new EventEmitter<TexasHoldemGameRoomEvents>();
(TexasHoldem as any).listener = {
  on: emitter.on.bind(emitter),
  off: emitter.off.bind(emitter),
  once: emitter.once.bind(emitter),
};
(TexasHoldem as any).bet = jest.fn().mockResolvedValue(undefined);
(TexasHoldem as any).fold = jest.fn().mockResolvedValue(undefined);
(TexasHoldem as any).startNewRound = jest.fn().mockResolvedValue(undefined);

const mockBet = (TexasHoldem as any).bet as jest.Mock;
const mockFold = (TexasHoldem as any).fold as jest.Mock;
const mockStartNewRound = (TexasHoldem as any).startNewRound as jest.Mock;

beforeEach(() => {
  emitter.removeAllListeners();
  mockBet.mockClear();
  mockFold.mockClear();
  mockStartNewRound.mockClear();
});

describe('useTexasHoldem', () => {
  test('initial state', () => {
    const {result} = renderHook(() => useTexasHoldem());

    expect(result.current.peerState).toBe('NotReady');
    expect(result.current.playerId).toBeUndefined();
    expect(result.current.members).toEqual([]);
    expect(result.current.round).toBeUndefined();
    expect(result.current.players).toBeUndefined();
    expect(result.current.smallBlind).toBeUndefined();
    expect(result.current.bigBlind).toBeUndefined();
    expect(result.current.button).toBeUndefined();
    expect(result.current.board).toEqual([]);
    expect(result.current.hole).toBeUndefined();
    expect(result.current.holesPerPlayer).toBeUndefined();
    expect(result.current.whoseTurnAndCallAmount).toBeNull();
    expect(result.current.potAmount).toBe(0);
    expect(result.current.bankrolls.size).toBe(0);
    expect(result.current.scoreBoard.size).toBe(0);
    expect(result.current.totalDebt.size).toBe(0);
    expect(result.current.myBetAmount).toBeUndefined();
    expect(result.current.lastWinningResult).toBeUndefined();
    expect(result.current.currentRoundFinished).toBe(true); // no round = finished
    expect(result.current.actionsDone).toBeNull();
  });

  test('connected event sets playerId', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('connected', 'player-A');
    });

    expect(result.current.playerId).toBe('player-A');
  });

  test('status event updates peerState', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('status', 'HostConnected');
    });

    expect(result.current.peerState).toBe('HostConnected');
  });

  test('members event updates members', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('members', ['A', 'B', 'C']);
    });

    expect(result.current.members).toEqual(['A', 'B', 'C']);
  });

  test('players event sets round, players, smallBlind, bigBlind, button', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['Alice', 'Bob', 'Charlie']);
    });

    expect(result.current.round).toBe(1);
    expect(result.current.players).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(result.current.smallBlind).toBe('Alice');
    expect(result.current.bigBlind).toBe('Bob');
    expect(result.current.button).toBe('Charlie');
  });

  test('players event with 2 players: button is last player', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['Alice', 'Bob']);
    });

    expect(result.current.smallBlind).toBe('Alice');
    expect(result.current.bigBlind).toBe('Bob');
    expect(result.current.button).toBe('Bob');
  });

  test('fund events update bankrolls', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('fund', 100, undefined, 'Alice');
      emitter.emit('fund', 200, undefined, 'Bob');
    });

    expect(result.current.bankrolls.get('Alice')).toBe(100);
    expect(result.current.bankrolls.get('Bob')).toBe(200);

    act(() => {
      emitter.emit('fund', 95, 100, 'Alice');
    });

    expect(result.current.bankrolls.get('Alice')).toBe(95);
  });

  test('fund events update scoreBoard (non-borrowed)', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('fund', 100, 0, 'Alice');
    });

    expect(result.current.scoreBoard.get('Alice')).toBe(100);
    expect(result.current.totalDebt.size).toBe(0);

    act(() => {
      emitter.emit('fund', 95, 100, 'Alice');
    });

    expect(result.current.scoreBoard.get('Alice')).toBe(95);
  });

  test('borrowed fund events update totalDebt, not scoreBoard', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('fund', 100, 0, 'Alice', true);
    });

    expect(result.current.totalDebt.get('Alice')).toBe(100);
    expect(result.current.scoreBoard.has('Alice')).toBe(false);
  });

  test('board events update board', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    expect(result.current.board).toEqual([]);

    const flop: [StandardCard, StandardCard, StandardCard] = [
      {suit: 'Club', rank: 'A'},
      {suit: 'Heart', rank: 'K'},
      {suit: 'Diamond', rank: 'Q'},
    ];
    act(() => {
      emitter.emit('board', 1, flop);
    });

    expect(result.current.board).toEqual(flop);

    const turn = [...flop, {suit: 'Spade', rank: 'J'}] as [StandardCard, StandardCard, StandardCard, StandardCard];
    act(() => {
      emitter.emit('board', 1, turn);
    });

    expect(result.current.board).toEqual(turn);

    const river = [...turn, {suit: 'Club', rank: 'T'}] as [StandardCard, StandardCard, StandardCard, StandardCard, StandardCard];
    act(() => {
      emitter.emit('board', 1, river);
    });

    expect(result.current.board).toEqual(river);
  });

  test('hole events set myHole and holesPerPlayer', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('connected', 'Alice');
      emitter.emit('players', 1, ['Alice', 'Bob']);
    });

    const aliceHole: Hole = [
      {suit: 'Club', rank: 'A'},
      {suit: 'Heart', rank: 'K'},
    ];
    const bobHole: Hole = [
      {suit: 'Diamond', rank: '2'},
      {suit: 'Spade', rank: '3'},
    ];

    act(() => {
      emitter.emit('hole', 1, 'Alice', aliceHole);
      emitter.emit('hole', 1, 'Bob', bobHole);
    });

    expect(result.current.hole).toEqual(aliceHole);
    expect(result.current.holesPerPlayer?.get('Alice')).toEqual(aliceHole);
    expect(result.current.holesPerPlayer?.get('Bob')).toEqual(bobHole);
  });

  test('hole is undefined when playerId not set', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['Alice', 'Bob']);
      emitter.emit('hole', 1, 'Alice', [
        {suit: 'Club', rank: 'A'},
        {suit: 'Heart', rank: 'K'},
      ]);
    });

    expect(result.current.hole).toBeUndefined();
    expect(result.current.holesPerPlayer?.get('Alice')).toBeDefined();
  });

  test('whoseTurn events update whoseTurnAndCallAmount', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('whoseTurn', 1, 'A', {callAmount: 2});
    });

    expect(result.current.whoseTurnAndCallAmount).toEqual({whoseTurn: 'A', callAmount: 2});

    act(() => {
      emitter.emit('whoseTurn', 1, null);
    });

    expect(result.current.whoseTurnAndCallAmount).toBeNull();
  });

  test('whoseTurn without actionMeta defaults callAmount to 0', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('whoseTurn', 1, 'A');
    });

    expect(result.current.whoseTurnAndCallAmount).toEqual({whoseTurn: 'A', callAmount: 0});
  });

  test('pot event updates potAmount', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('pot', 1, 15);
    });

    expect(result.current.potAmount).toBe(15);
  });

  test('bet events track actionsDone', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('bet', 1, 5, 'A', false);
    });

    expect(result.current.actionsDone?.get('A')).toBe(5);

    act(() => {
      emitter.emit('bet', 1, 10, 'A', false);
    });

    expect(result.current.actionsDone?.get('A')).toBe(15);
  });

  test('all-in bet sets action to "all-in"', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('bet', 1, 100, 'A', true);
    });

    expect(result.current.actionsDone?.get('A')).toBe('all-in');
  });

  test('fold event sets action to "fold"', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('fold', 1, 'A');
    });

    expect(result.current.actionsDone?.get('A')).toBe('fold');
  });

  test('check (bet 0) shows as "check"', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('bet', 1, 0, 'A', false);
    });

    expect(result.current.actionsDone?.get('A')).toBe('check');
  });

  test('allSet clears bet actions but keeps fold/all-in', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B', 'C']);
    });

    act(() => {
      emitter.emit('bet', 1, 5, 'A', false);
      emitter.emit('fold', 1, 'B');
      emitter.emit('bet', 1, 100, 'C', true);
    });

    expect(result.current.actionsDone?.get('A')).toBe(5);
    expect(result.current.actionsDone?.get('B')).toBe('fold');
    expect(result.current.actionsDone?.get('C')).toBe('all-in');

    act(() => {
      emitter.emit('allSet', 1);
    });

    expect(result.current.actionsDone?.has('A')).toBe(false);
    expect(result.current.actionsDone?.get('B')).toBe('fold');
    expect(result.current.actionsDone?.get('C')).toBe('all-in');
  });

  test('winner event clears actionsDone', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
      emitter.emit('bet', 1, 5, 'A', false);
    });

    expect(result.current.actionsDone?.get('A')).toBe(5);

    act(() => {
      emitter.emit('winner', {how: 'LastOneWins', round: 1, winner: 'B'} as WinningResult);
    });

    expect(result.current.actionsDone).toBeNull();
  });

  test('bet events track myBetAmount for current player', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('connected', 'Alice');
      emitter.emit('players', 1, ['Alice', 'Bob']);
    });

    act(() => {
      emitter.emit('bet', 1, 1, 'Alice', false);
    });

    expect(result.current.myBetAmount).toBe(1);

    act(() => {
      emitter.emit('bet', 1, 3, 'Alice', false);
    });

    expect(result.current.myBetAmount).toBe(4);

    act(() => {
      emitter.emit('bet', 1, 10, 'Bob', false);
    });

    expect(result.current.myBetAmount).toBe(4);
  });

  test('winner event sets lastWinningResult and currentRoundFinished', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    expect(result.current.currentRoundFinished).toBe(false);
    expect(result.current.lastWinningResult).toBeUndefined();

    const winResult: WinningResult = {
      how: 'LastOneWins',
      round: 1,
      winner: 'B',
    };

    act(() => {
      emitter.emit('winner', winResult);
    });

    expect(result.current.lastWinningResult).toEqual(winResult);
    expect(result.current.currentRoundFinished).toBe(true);
  });

  test('showdown winner result', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    const showdownResult: WinningResult = {
      how: 'Showdown',
      round: 1,
      showdown: [
        {strength: 100, handValue: 1, players: ['A']},
        {strength: 200, handValue: 2, players: ['B']},
      ],
    };

    act(() => {
      emitter.emit('winner', showdownResult);
    });

    expect(result.current.lastWinningResult).toEqual(showdownResult);
    expect(result.current.currentRoundFinished).toBe(true);
  });

  test('fireBet calls TexasHoldem.bet with current round', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    await act(async () => {
      await result.current.actions.fireBet(10);
    });

    expect(mockBet).toHaveBeenCalledWith(1, 10);
  });

  test('fireBet does nothing when no round', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    await act(async () => {
      await result.current.actions.fireBet(10);
    });

    expect(mockBet).not.toHaveBeenCalled();
  });

  test('fireFold calls TexasHoldem.fold with current round', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    await act(async () => {
      await result.current.actions.fireFold();
    });

    expect(mockFold).toHaveBeenCalledWith(1);
  });

  test('fireFold does nothing when no round', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    await act(async () => {
      await result.current.actions.fireFold();
    });

    expect(mockFold).not.toHaveBeenCalled();
  });

  test('startGame calls TexasHoldem.startNewRound with defaults', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    await act(async () => {
      await result.current.startGame();
    });

    expect(mockStartNewRound).toHaveBeenCalledWith({
      bits: undefined,
      initialFundAmount: 100,
    });
  });

  test('startGame passes custom settings', async () => {
    const {result} = renderHook(() => useTexasHoldem());

    await act(async () => {
      await result.current.startGame({initialFundAmount: 500, bits: 256});
    });

    expect(mockStartNewRound).toHaveBeenCalledWith({
      bits: 256,
      initialFundAmount: 500,
    });
  });

  test('round change resets board for new round', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
      emitter.emit('board', 1, [
        {suit: 'Club', rank: 'A'},
        {suit: 'Heart', rank: 'K'},
        {suit: 'Diamond', rank: 'Q'},
      ]);
    });

    expect(result.current.board).toHaveLength(3);

    act(() => {
      emitter.emit('players', 2, ['B', 'A']);
    });

    expect(result.current.round).toBe(2);
    expect(result.current.board).toEqual([]);
  });

  test('fold after bet still shows fold', () => {
    const {result} = renderHook(() => useTexasHoldem());

    act(() => {
      emitter.emit('players', 1, ['A', 'B']);
    });

    act(() => {
      emitter.emit('bet', 1, 5, 'A', false);
    });

    expect(result.current.actionsDone?.get('A')).toBe(5);

    act(() => {
      emitter.emit('fold', 1, 'A');
    });

    expect(result.current.actionsDone?.get('A')).toBe('fold');
  });

  test('cleanup removes listeners on unmount', () => {
    const {unmount} = renderHook(() => useTexasHoldem());

    unmount();

    const eventNames: Array<keyof TexasHoldemGameRoomEvents> = [
      'connected', 'status', 'members', 'players', 'fund',
      'board', 'hole', 'whoseTurn', 'pot', 'bet', 'fold', 'allSet', 'winner',
    ];

    for (const eventName of eventNames) {
      expect(emitter.listenerCount(eventName)).toBe(0);
    }
  });
});
