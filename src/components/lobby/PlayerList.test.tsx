import React from 'react';
import {render, screen} from '@testing-library/react';
import PlayerList from './PlayerList';

const baseProps = {
  playerId: 'p1',
  hostPlayerId: 'p1',
  members: ['p1', 'p2'],
  names: new Map([['p2', 'Bob']]),
  setMyName: jest.fn(),
};

test('renders a row per member', () => {
  render(<PlayerList {...baseProps}/>);
  expect(screen.getByTestId('lobby-player-0')).toBeInTheDocument();
  expect(screen.getByTestId('lobby-player-1')).toBeInTheDocument();
  expect(screen.queryByTestId('lobby-player-2')).toBeNull();
});

test('shows You and Host chips on my row when I am the host', () => {
  render(<PlayerList {...baseProps}/>);
  const myRow = screen.getByTestId('lobby-player-0');
  expect(myRow).toHaveTextContent('You');
  expect(myRow).toHaveTextContent('Host');
});

test('shows the Host chip on the host row when I am a guest', () => {
  render(<PlayerList {...baseProps} playerId="p2" hostPlayerId="p1"/>);
  const hostRow = screen.getByTestId('lobby-player-0');
  expect(hostRow).toHaveTextContent('Host');
  expect(hostRow).not.toHaveTextContent('You');
  const myRow = screen.getByTestId('lobby-player-1');
  expect(myRow).toHaveTextContent('You');
});

test('shows other members by name when known', () => {
  render(<PlayerList {...baseProps}/>);
  expect(screen.getByTestId('lobby-player-1')).toHaveTextContent('Bob');
});

test('shows a hint when I am the only member', () => {
  render(<PlayerList {...baseProps} members={['p1']}/>);
  expect(screen.getByTestId('lobby-players')).toHaveTextContent(/only one here/i);
});

test('renders the name input for my row when I have no name yet', () => {
  render(<PlayerList {...baseProps}/>);
  expect(screen.getByTestId('my-name-input')).toBeInTheDocument();
});
