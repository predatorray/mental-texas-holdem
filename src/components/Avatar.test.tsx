import React from 'react';
import { render } from '@testing-library/react';
import Avatar from "./Avatar";

test('rendering does not crash', () => {
  render(<Avatar />);
});
