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

test.each([
  ['cleared', ''],
  ['zero', '0'],
  ['negative', '-5'],
  ['fractional', '12.5'],
])('start is disabled and an error is shown when the initial amount is %s', (_label, value) => {
  const startGame = jest.fn();
  render(<GameSettings members={['p1', 'p2']} startGame={startGame}/>);

  fireEvent.change(screen.getByTestId('initial-fund-amount-input'), {target: {value}});

  const startButton = screen.getByTestId('start-button');
  expect(startButton).toBeDisabled();
  expect(screen.getByText('Enter a positive whole number.')).toBeInTheDocument();
  fireEvent.click(startButton);
  expect(startGame).not.toHaveBeenCalled();
});

test('start is re-enabled once the initial amount becomes valid again', () => {
  const startGame = jest.fn();
  render(<GameSettings members={['p1', 'p2']} startGame={startGame}/>);

  const input = screen.getByTestId('initial-fund-amount-input');
  fireEvent.change(input, {target: {value: ''}});
  expect(screen.getByTestId('start-button')).toBeDisabled();

  fireEvent.change(input, {target: {value: '200'}});
  expect(screen.getByTestId('start-button')).toBeEnabled();
  fireEvent.click(screen.getByTestId('start-button'));
  expect(startGame).toHaveBeenCalledWith({bits: 32, initialFundAmount: 200});
});
