import React from 'react';
import {render, screen} from '@testing-library/react';
import Staging from './Staging';
import Invitation from './Invitation';

// Simulate being a guest: the setup module reports the host's peer id.
jest.mock('../lib/setup', () => ({
  HostId: 'host-peer-id',
}));

test('guests see a waiting message instead of the continue button', () => {
  render(<Staging round={1} playerId="p2" members={['host-peer-id', 'p2']} startGame={jest.fn()}/>);
  expect(screen.getByTestId('staging')).toHaveTextContent(/Waiting for the host/);
  expect(screen.queryByTestId('continue-button')).toBeNull();
});

test('guest invitation link is the current page url', () => {
  render(<Invitation hostPlayerId="host-peer-id"/>);
  expect(screen.getByTestId('room-link')).toHaveValue(window.location.href);
});
