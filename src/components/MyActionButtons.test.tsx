import React from 'react';
import {render, screen} from '@testing-library/react';
import MyActionButtons from './MyActionButtons';
import {Board, Hole} from '../lib/rules';

const hole: Hole = [{suit: 'Spade', rank: 'A'}, {suit: 'Heart', rank: 'K'}];
const board: Board = [{suit: 'Club', rank: '2'}, {suit: 'Diamond', rank: '3'}, {suit: 'Heart', rank: '4'}];
const bankrolls = new Map([['player1', 1000], ['player2', 500]]);

const baseProps = {
  playerId: 'player1',
  players: ['player1', 'player2'],
  whoseTurnAndCallAmount: {whoseTurn: 'player1', callAmount: 0},
  hole,
  board,
  currentRoundFinished: false,
  potAmount: 100,
  bankrolls,
  fireBet: jest.fn(),
  fireFold: jest.fn(),
};

test('renders action buttons when it is my turn', () => {
  render(<MyActionButtons {...baseProps} />);
  expect(screen.getByTestId('check-or-call-action-button')).toBeInTheDocument();
});

test('renders nothing when playerId is undefined', () => {
  const {container} = render(<MyActionButtons {...baseProps} playerId={undefined} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when it is not my turn', () => {
  const {container} = render(
    <MyActionButtons {...baseProps} whoseTurnAndCallAmount={{whoseTurn: 'player2', callAmount: 0}} />
  );
  expect(container.innerHTML).toBe('');
});

test('renders nothing when round is finished', () => {
  const {container} = render(<MyActionButtons {...baseProps} currentRoundFinished={true} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when hole is undefined', () => {
  const {container} = render(<MyActionButtons {...baseProps} hole={undefined} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when players is undefined', () => {
  const {container} = render(<MyActionButtons {...baseProps} players={undefined} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when whoseTurnAndCallAmount is null', () => {
  const {container} = render(<MyActionButtons {...baseProps} whoseTurnAndCallAmount={null} />);
  expect(container.innerHTML).toBe('');
});
