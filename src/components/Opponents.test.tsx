import React from 'react';
import {render, screen, within} from '@testing-library/react';
import Opponents from './Opponents';
import {Board, Hole} from '../lib/rules';

const board: Board = [{suit: 'Club', rank: '2'}, {suit: 'Diamond', rank: '3'}, {suit: 'Heart', rank: '4'}];

const baseProps = {
  members: ['p1', 'p2', 'p3'],
  playerId: 'p1',
  players: undefined as string[] | undefined,
  names: new Map([['p1', 'Alice'], ['p2', 'Bob'], ['p3', 'Charlie']]),
  bankrolls: new Map([['p1', 1000], ['p2', 500], ['p3', 300]]),
  board,
  whoseTurn: undefined as string | undefined,
  holesPerPlayer: undefined as Map<string, Hole> | undefined,
  mainPotWinners: null,
  actionsDone: null,
};

test('renders opponents from members when players is undefined (lobby state)', () => {
  render(<Opponents {...baseProps} />);
  expect(screen.getByTestId('opponents')).toBeInTheDocument();
  expect(screen.getByTestId('opponent-0')).toBeInTheDocument();
  expect(screen.getByTestId('opponent-1')).toBeInTheDocument();
});

test('excludes self from opponents when using members', () => {
  render(<Opponents {...baseProps} />);
  // p1 is self, p2 and p3 are opponents = 2 opponents
  expect(screen.queryByTestId('opponent-2')).toBeNull();
});

test('circular reorder: opponents start after my position', () => {
  // players order is [p2, p1, p3]. p1 is at index 1.
  // slice(2) = [p3], slice(0,1) = [p2] → opponents = [p3, p2] (Charlie, Bob)
  // This verifies the circular slicing logic produces a different order than the input
  render(<Opponents {...baseProps} players={['p2', 'p1', 'p3']} />);
  const opponent0 = screen.getByTestId('opponent-0');
  const opponent1 = screen.getByTestId('opponent-1');
  expect(within(opponent0).getByText('Charlie')).toBeInTheDocument(); // p3 sits after p1
  expect(within(opponent1).getByText('Bob')).toBeInTheDocument();     // p2 wraps around
});

test('falls back to full player list when playerId not in players', () => {
  // myOffset < 0 branch: playerId is not in the players array
  render(<Opponents {...baseProps} playerId="unknown" players={['p1', 'p2', 'p3']} />);
  // All 3 players should render as opponents since "unknown" is not among them
  expect(screen.getByTestId('opponent-0')).toBeInTheDocument();
  expect(screen.getByTestId('opponent-1')).toBeInTheDocument();
  expect(screen.getByTestId('opponent-2')).toBeInTheDocument();
});

test('highlights the opponent whose turn it is', () => {
  const {container} = render(
    <Opponents {...baseProps} players={['p1', 'p2', 'p3']} whoseTurn="p2" />
  );
  const highlighted = container.querySelector('.highlight');
  expect(highlighted).toBeInTheDocument();
});

test('applies winner class to winning opponent', () => {
  const {container} = render(
    <Opponents {...baseProps} players={['p1', 'p2', 'p3']} mainPotWinners={new Set(['p2'])} />
  );
  expect(container.querySelector('.opponent.winner')).toBeInTheDocument();
});

test('does not apply winner class when no winners', () => {
  const {container} = render(
    <Opponents {...baseProps} players={['p1', 'p2', 'p3']} />
  );
  expect(container.querySelector('.opponent.winner')).toBeNull();
});

test('renders bankrolls for opponents', () => {
  render(<Opponents {...baseProps} players={['p1', 'p2', 'p3']} />);
  expect(screen.getByText('$500')).toBeInTheDocument();
  expect(screen.getByText('$300')).toBeInTheDocument();
});

test('renders opponent hole cards during showdown', () => {
  const holesPerPlayer = new Map<string, Hole>([
    ['p2', [{suit: 'Spade', rank: 'A'}, {suit: 'Heart', rank: 'K'}]],
  ]);
  render(
    <Opponents {...baseProps} players={['p1', 'p2', 'p3']} holesPerPlayer={holesPerPlayer} />
  );
  // Each opponent gets 2 CardImage components (hand-card-0 and hand-card-1)
  const handCard0s = screen.getAllByTestId('hand-card-0');
  expect(handCard0s.length).toBe(2);
});

test('renders bet amounts when actionsDone is provided', () => {
  const actionsDone = new Map<string, string | number>([['p2', 50], ['p3', 'fold']]);
  render(
    <Opponents {...baseProps} players={['p1', 'p2', 'p3']} actionsDone={actionsDone} />
  );
  const betAmounts = screen.getAllByTestId('bet-amount');
  expect(betAmounts.length).toBe(2);
});

test('renders nothing when playerId is undefined and players is undefined', () => {
  const {container} = render(
    <Opponents {...baseProps} playerId={undefined} players={undefined} />
  );
  expect(container.querySelector('[data-testid="opponents"]')).toBeNull();
});
