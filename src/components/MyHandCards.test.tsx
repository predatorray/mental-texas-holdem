import React from 'react';
import {render, screen} from '@testing-library/react';
import MyHandCards from './MyHandCards';
import {Hole} from '../lib/rules';

test('renders hand cards when hole is provided', () => {
  const hole: Hole = [{suit: 'Spade', rank: 'A'}, {suit: 'Heart', rank: 'K'}];
  render(<MyHandCards hole={hole} />);
  expect(screen.getByTestId('hand-card-0')).toBeInTheDocument();
  expect(screen.getByTestId('hand-card-1')).toBeInTheDocument();
});

test('renders nothing when hole is undefined', () => {
  const {container} = render(<MyHandCards hole={undefined} />);
  expect(container.innerHTML).toBe('');
});
