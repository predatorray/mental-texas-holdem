import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import TexasHoldemGameTable from "./TexasHoldemGameTable";
import {TexasHoldem} from "../lib/setup";

jest.mock('../lib/setup');

const emit = (event: string, ...args: unknown[]) => {
  (TexasHoldem.listener as unknown as {emit: (e: string, ...a: unknown[]) => void}).emit(event, ...args);
};

test('rendering does not crash', () => {
  render(<TexasHoldemGameTable />);
});

test('shows the lobby before the first round starts', () => {
  render(<TexasHoldemGameTable />);
  expect(screen.getByTestId('lobby')).toBeInTheDocument();
});

test('host can start the game from the lobby once another player joins', () => {
  render(<TexasHoldemGameTable />);
  act(() => {
    emit('connected', 'mock-peer-id');
    emit('members', ['mock-peer-id', 'p2']);
  });
  const startButton = screen.getByTestId('start-button');
  fireEvent.click(startButton);
});

test('switches from the lobby to the game screen when a round starts', () => {
  render(<TexasHoldemGameTable />);
  expect(screen.getByTestId('lobby')).toBeInTheDocument();

  act(() => {
    emit('connected', 'mock-peer-id');
    emit('members', ['mock-peer-id', 'p2']);
    emit('players', 1, ['mock-peer-id', 'p2']);
  });

  expect(screen.queryByTestId('lobby')).toBeNull();
  expect(screen.getByTestId('table')).toBeInTheDocument();
  expect(screen.getByTestId('opponents')).toBeInTheDocument();
});
