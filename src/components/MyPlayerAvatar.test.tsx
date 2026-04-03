import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import MyPlayerAvatar from './MyPlayerAvatar';

test('renders nothing when playerId is undefined', () => {
  const {container} = render(
    <MyPlayerAvatar playerId={undefined} names={new Map()} setMyName={jest.fn()} />
  );
  expect(container.innerHTML).toBe('');
});

test('shows name input when player has no name', () => {
  render(
    <MyPlayerAvatar playerId="p1" names={new Map()} setMyName={jest.fn()} />
  );
  expect(screen.getByTestId('my-name-input')).toBeInTheDocument();
});

test('shows player name when name is set', () => {
  const names = new Map([['p1', 'Alice']]);
  render(
    <MyPlayerAvatar playerId="p1" names={names} setMyName={jest.fn()} />
  );
  expect(screen.getByText('Alice')).toBeInTheDocument();
});

test('clicking name switches to edit mode', () => {
  const names = new Map([['p1', 'Alice']]);
  render(
    <MyPlayerAvatar playerId="p1" names={names} setMyName={jest.fn()} />
  );
  fireEvent.click(screen.getByText('Alice'));
  expect(screen.getByTestId('my-name-input')).toBeInTheDocument();
});

test('pressing Enter with a value calls setMyName', () => {
  const setMyName = jest.fn();
  render(
    <MyPlayerAvatar playerId="p1" names={new Map()} setMyName={setMyName} />
  );
  const input = screen.getByTestId('my-name-input');
  fireEvent.change(input, {target: {value: 'Bob'}});
  fireEvent.keyUp(input, {key: 'Enter'});
  expect(setMyName).toHaveBeenCalledWith('Bob');
});

test('pressing Enter with empty value does not call setMyName', () => {
  const setMyName = jest.fn();
  render(
    <MyPlayerAvatar playerId="p1" names={new Map()} setMyName={setMyName} />
  );
  const input = screen.getByTestId('my-name-input');
  fireEvent.keyUp(input, {key: 'Enter'});
  expect(setMyName).not.toHaveBeenCalled();
});

test('pressing non-Enter key does not call setMyName', () => {
  const setMyName = jest.fn();
  render(
    <MyPlayerAvatar playerId="p1" names={new Map()} setMyName={setMyName} />
  );
  const input = screen.getByTestId('my-name-input');
  fireEvent.change(input, {target: {value: 'Bob'}});
  fireEvent.keyUp(input, {key: 'Escape'});
  expect(setMyName).not.toHaveBeenCalled();
});
