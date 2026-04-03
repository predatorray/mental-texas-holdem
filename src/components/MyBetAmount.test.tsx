import React from 'react';
import {render, screen} from '@testing-library/react';
import MyBetAmount from './MyBetAmount';

test('renders BetAmount when playerId and actionsDone are provided', () => {
  const actionsDone = new Map<string, string | number>([['p1', 100]]);
  render(<MyBetAmount playerId="p1" actionsDone={actionsDone} />);
  expect(screen.getByTestId('bet-amount')).toBeInTheDocument();
});

test('renders nothing when playerId is undefined', () => {
  const {container} = render(<MyBetAmount playerId={undefined} actionsDone={new Map()} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when actionsDone is null', () => {
  const {container} = render(<MyBetAmount playerId="p1" actionsDone={null} />);
  expect(container.innerHTML).toBe('');
});
