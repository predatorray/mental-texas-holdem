import React from 'react';
import {render, screen} from '@testing-library/react';
import MyBankroll from './MyBankroll';

test('renders bankroll amount for player', () => {
  const bankrolls = new Map([['p1', 750]]);
  render(<MyBankroll playerId="p1" players={['p1', 'p2']} bankrolls={bankrolls} />);
  expect(screen.getByText('$750')).toBeInTheDocument();
});

test('renders $0 when player not in bankrolls map', () => {
  render(<MyBankroll playerId="p1" players={['p1']} bankrolls={new Map()} />);
  expect(screen.getByText('$0')).toBeInTheDocument();
});

test('renders nothing when playerId is undefined', () => {
  const {container} = render(<MyBankroll playerId={undefined} players={['p1']} bankrolls={new Map()} />);
  expect(container.innerHTML).toBe('');
});

test('renders nothing when players is undefined', () => {
  const {container} = render(<MyBankroll playerId="p1" players={undefined} bankrolls={new Map()} />);
  expect(container.innerHTML).toBe('');
});
