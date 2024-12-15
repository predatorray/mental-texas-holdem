import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import MessageBar from "./MessageBar";
import {EventLogs} from "../lib/texas-holdem/useEventLogs";
import {Messages} from "../lib/useChatRoom";
import Deferred from "../lib/Deferred";

test('rendering does not crash', () => {
  render(<MessageBar
    playerId="player"
    eventLogs={[]}
    messages={[]}
    names={new Map<string, string>()}
  />);
});

test('rendering with messages and event logs', () => {
  const messages: Messages = [
    {
      type: 'message',
      text: 'ABC',
      whose: 'player1',
      timestamp: 0,
    },
    {
      type: 'message',
      text: 'ABC',
      whose: 'player2',
      timestamp: 1,
    },
  ];
  const eventLogs: EventLogs = [
    {
      type: 'newRound',
      round: 0,
      players: ['player1', 'player2'],
      timestamp: 2,
    },
    {
      type: 'check',
      playerId: 'player1',
      timestamp: 3,
    },
    {
      type: 'raise',
      playerId: 'player2',
      raisedAmount: 1,
      allin: false,
      timestamp: 4,
    },
    {
      type: 'fold',
      playerId: 'player1',
      timestamp: 5,
    },
    {
      type: 'winner',
      result: {
        how: 'LastOneWins',
        round: 1,
        winner: 'player2',
      },
      timestamp: 6,
    },
    {
      type: 'winner',
      result: {
        how: 'Showdown',
        round: 1,
        showdown: [
          {
            strength: 1,
            handValue: 1,
            players: ['player1'],
          },
          {
            strength: 2,
            handValue: 2,
            players: ['player2'],
          },
        ]
      },
      timestamp: 7,
    },
    {
      type: 'fund',
      playerId: 'player1',
      currentAmount: 1,
      borrowed: false,
      timestamp: 8,
    },
    {
      type: 'fund',
      playerId: 'player2',
      previousAmount: 1,
      currentAmount: 2,
      borrowed: true,
      timestamp: 9,
    },
  ];
  render(<MessageBar
    playerId="player1"
    eventLogs={eventLogs}
    messages={messages}
    names={new Map<string, string>()}
  />);
});

test('sending message', async () => {
  const messageDeferred = new Deferred<string>();
  const messageCallback = (message: string) => {messageDeferred.resolve(message)};
  render(<MessageBar
    playerId="player1"
    eventLogs={[]}
    messages={[]}
    onMessage={messageCallback}
    names={new Map<string, string>()}
  />);

  const messageInput = screen.getByTestId('message-input');
  fireEvent.change(messageInput, { target: { value: 'ABC' } });
  fireEvent.keyUp(messageInput, { key: 'Enter' });

  const messageReceived = await messageDeferred.promise;
  expect(messageReceived).toBe('ABC');
});
