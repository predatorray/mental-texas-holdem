import React from 'react';
import {render} from '@testing-library/react';
import MySeat from './MySeat';
import {Board, Hole} from '../lib/rules';

const hole: Hole = [{suit: 'Spade', rank: 'A'}, {suit: 'Heart', rank: 'K'}];
const board: Board = [{suit: 'Club', rank: '2'}, {suit: 'Diamond', rank: '3'}, {suit: 'Heart', rank: '4'}];

const baseProps = {
  playerId: 'p1',
  players: ['p1', 'p2'],
  board,
  hole,
  potAmount: 200,
  bankrolls: new Map([['p1', 1000], ['p2', 500]]),
  names: new Map([['p1', 'Alice']]),
  setMyName: jest.fn(),
  mainPotWinners: null,
  currentRoundFinished: false,
  actionsDone: null,
  whoseTurnAndCallAmount: null,
  actions: {
    fireBet: jest.fn().mockResolvedValue(undefined),
    fireFold: jest.fn().mockResolvedValue(undefined),
  },
};

test('applies winner class when player is a winner', () => {
  const {container} = render(
    <MySeat {...baseProps} mainPotWinners={new Set(['p1'])} />
  );
  expect(container.querySelector('.my-seat.winner')).toBeInTheDocument();
});

test('does not apply winner class when player is not a winner', () => {
  const {container} = render(
    <MySeat {...baseProps} mainPotWinners={new Set(['p2'])} />
  );
  expect(container.querySelector('.my-seat')).toBeInTheDocument();
  expect(container.querySelector('.my-seat.winner')).toBeNull();
});

test('does not apply winner class when mainPotWinners is null', () => {
  const {container} = render(<MySeat {...baseProps} />);
  expect(container.querySelector('.my-seat.winner')).toBeNull();
});

test('does not apply winner class when playerId is undefined', () => {
  const {container} = render(
    <MySeat {...baseProps} playerId={undefined} mainPotWinners={new Set(['p1'])} />
  );
  expect(container.querySelector('.my-seat.winner')).toBeNull();
});
