import React from 'react';
import {render, screen} from '@testing-library/react';
import PokerTable from './PokerTable';
import {Board} from '../lib/rules';

const board: Board = [{suit: 'Club', rank: '2'}, {suit: 'Diamond', rank: '3'}, {suit: 'Heart', rank: '4'}];

const baseProps = {
  members: ['p1', 'p2'],
  playerId: 'p1',
  players: ['p1', 'p2'] as string[] | undefined,
  round: 1,
  board,
  potAmount: 200,
  currentRoundFinished: false,
  lastWinningResult: undefined,
  startGame: jest.fn().mockResolvedValue(undefined),
};

test('renders community cards when players and board exist', () => {
  render(<PokerTable {...baseProps} />);
  expect(screen.getByTestId('pot')).toBeInTheDocument();
});

test('does not render community cards when players is undefined', () => {
  render(<PokerTable {...baseProps} players={undefined} />);
  expect(screen.queryByTestId('pot')).toBeNull();
});

test('renders staging area when round is finished', () => {
  render(<PokerTable {...baseProps} currentRoundFinished={true} />);
  expect(screen.getByTestId('staging')).toBeInTheDocument();
});

test('does not render staging when round is in progress', () => {
  render(<PokerTable {...baseProps} currentRoundFinished={false} />);
  expect(screen.queryByTestId('staging')).toBeNull();
});

test('does not render staging when playerId is undefined (spectator)', () => {
  render(<PokerTable {...baseProps} playerId={undefined} currentRoundFinished={true} />);
  expect(screen.queryByTestId('staging')).toBeNull();
});
