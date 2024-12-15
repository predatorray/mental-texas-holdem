import React from 'react';
import { render } from '@testing-library/react';
import PlayerAvatar from "./PlayerAvatar";

test('rendering does not crash', () => {
  render(<PlayerAvatar playerId="player"/>);
});

test('rendering with player name', () => {
  render(<PlayerAvatar playerId="player" playerName="name"/>);
});

test('rendering with children', () => {
  render(<PlayerAvatar playerId="player">
    <span>foobar</span>
  </PlayerAvatar>);
});
