import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import Avatar, {PLACEHOLDER_SRC} from "./Avatar";

test('rendering does not crash', () => {
  render(<Avatar />);
});

test('rendering on error', () => {
  render(<Avatar data-testid="avatar" src='url1' />);
  const img = screen.getByTestId('avatar');
  expect(img.getAttribute('src')).toContain('url1');

  fireEvent.error(img);

  const placeholder = img.getAttribute('src');
  expect(placeholder).toBe(PLACEHOLDER_SRC);
});
