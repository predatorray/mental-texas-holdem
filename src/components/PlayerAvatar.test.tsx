import React from 'react';
import { render } from '@testing-library/react';
import PlayerAvatar from "./PlayerAvatar";

test('rendering does not crash', () => {
  render(<PlayerAvatar playerId="player"/>);
});
