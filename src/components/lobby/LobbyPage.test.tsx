import React from 'react';
import {render, screen} from '@testing-library/react';
import LobbyPage from './LobbyPage';

jest.mock('../../lib/setup');

const baseProps = {
  playerId: 'p1',
  iAmHost: true,
  hostPlayerId: 'p1',
  members: ['p1', 'p2'],
  names: new Map<string, string>(),
  setMyName: jest.fn(),
  messages: [],
  sendMessage: jest.fn(),
  eventLogs: [],
  startGame: jest.fn().mockResolvedValue(undefined),
};

test('shows a connecting indicator until the player id is assigned', () => {
  render(<LobbyPage {...baseProps} playerId={undefined}/>);
  expect(screen.getByTestId('lobby-connecting')).toBeInTheDocument();
  expect(screen.queryByTestId('staging')).toBeNull();
});

test('renders invite, players, settings, and chat for the host', () => {
  render(<LobbyPage {...baseProps}/>);
  expect(screen.getByTestId('lobby')).toBeInTheDocument();
  expect(screen.getByTestId('invitation')).toBeInTheDocument();
  expect(screen.getByTestId('room-link')).toBeInTheDocument();
  expect(screen.getByTestId('lobby-players')).toBeInTheDocument();
  expect(screen.getByTestId('staging')).toBeInTheDocument();
  expect(screen.getByTestId('start-button')).toBeInTheDocument();
  expect(screen.getByTestId('message-bar')).toBeInTheDocument();
});

test('renders the waiting card for guests', () => {
  render(<LobbyPage {...baseProps} iAmHost={false} hostPlayerId="host-id" playerId="p2"/>);
  expect(screen.getByTestId('staging')).toHaveTextContent(/Waiting for the host/);
  expect(screen.queryByTestId('start-button')).toBeNull();
});
