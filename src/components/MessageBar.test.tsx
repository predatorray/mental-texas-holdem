import React from 'react';
import { render } from '@testing-library/react';
import MessageBar from "./MessageBar";

test('rendering does not crash', () => {
  render(<MessageBar
    playerId="player"
    eventLogs={[]}
    messages={[]}
    names={new Map<string, string>()}
  />);
});
