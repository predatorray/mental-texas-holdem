import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import GameSettings from './GameSettings';

test('renders the fixed blinds and default settings', () => {
  render(<GameSettings members={['p1', 'p2']} startGame={jest.fn()}/>);
  expect(screen.getByTestId('sb-input')).toHaveValue('1');
  expect(screen.getByTestId('bb-input')).toHaveValue('2');
  expect(screen.getByTestId('initial-fund-amount-input')).toHaveValue(100);
  expect(screen.getByTestId('encryption-key-length-option')).toHaveValue('32');
});

test('start button is hidden until a second player joins', () => {
  render(<GameSettings members={['p1']} startGame={jest.fn()}/>);
  expect(screen.queryByTestId('start-button')).toBeNull();
  expect(screen.getByTestId('staging')).toHaveTextContent(/Needs 1 more player/);
});

test('clicking start passes the chosen settings', () => {
  const startGame = jest.fn();
  render(<GameSettings members={['p1', 'p2']} startGame={startGame}/>);

  fireEvent.change(screen.getByTestId('initial-fund-amount-input'), {target: {value: '250'}});
  fireEvent.change(screen.getByTestId('encryption-key-length-option'), {target: {value: '64'}});
  fireEvent.click(screen.getByTestId('start-button'));

  expect(startGame).toHaveBeenCalledWith({bits: 64, initialFundAmount: 250});
});
