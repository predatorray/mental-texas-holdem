import React from 'react';
import {render, screen} from '@testing-library/react';
import {GameScreen} from './TexasHoldemGameTable';
import {Board, Hole} from '../lib/rules';
import {WinningResult} from '../lib/texas-holdem/TexasHoldemGameRoom';

jest.mock('../lib/setup');

const hole: Hole = [{suit: 'Spade', rank: 'A'}, {suit: 'Heart', rank: 'K'}];
const board: Board = [{suit: 'Club', rank: '2'}, {suit: 'Diamond', rank: '3'}, {suit: 'Heart', rank: '4'}];

const baseProps = {
  playerId: 'p1',
  members: ['p1', 'p2'],
  players: ['p1', 'p2'] as string[] | undefined,
  round: 1,
  currentRoundFinished: false,
  hole,
  holesPerPlayer: new Map<string, Hole>(),
  board,
  whoseTurnAndCallAmount: null,
  bankrolls: new Map([['p1', 100], ['p2', 100]]),
  scoreBoard: new Map([['p1', 0], ['p2', 0]]),
  totalDebt: new Map([['p1', 100], ['p2', 100]]),
  potAmount: 3,
  lastWinningResult: undefined as WinningResult | undefined,
  actionsDone: null,
  actions: {
    fireBet: jest.fn().mockResolvedValue(undefined),
    fireFold: jest.fn().mockResolvedValue(undefined),
  },
  mainPotWinners: null,
  names: new Map<string, string>(),
  setMyName: jest.fn(),
  messages: [],
  sendMessage: jest.fn(),
  eventLogs: [],
  startGame: jest.fn().mockResolvedValue(undefined),
};

test('renders the table, opponents, seat and chat during a round', () => {
  render(<GameScreen {...baseProps}/>);
  expect(screen.getByTestId('table')).toBeInTheDocument();
  expect(screen.getByTestId('pot')).toBeInTheDocument();
  expect(screen.getByTestId('opponents')).toBeInTheDocument();
  expect(screen.getByTestId('my-bankroll')).toBeInTheDocument();
  expect(screen.getByTestId('message-bar')).toBeInTheDocument();
  // No score board while the round is in progress
  expect(screen.queryByTestId('score-board-toggle')).toBeNull();
});

test('renders the score board and staging when the round is finished', () => {
  const lastWinningResult: WinningResult = {how: 'LastOneWins', round: 1, winner: 'p1'};
  render(<GameScreen
    {...baseProps}
    currentRoundFinished={true}
    lastWinningResult={lastWinningResult}
    mainPotWinners={new Set(['p1'])}
  />);
  expect(screen.getByTestId('score-board-toggle')).toBeInTheDocument();
  expect(screen.getByTestId('staging')).toBeInTheDocument();
  expect(screen.getByTestId('continue-button')).toBeInTheDocument();
});

test('does not render chat when the player id is not assigned yet', () => {
  render(<GameScreen {...baseProps} playerId={undefined}/>);
  expect(screen.queryByTestId('message-bar')).toBeNull();
});
