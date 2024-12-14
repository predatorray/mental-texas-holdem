import React from 'react';
import { render } from '@testing-library/react';
import CardImage from "./CardImage";

test('rendering does not crash', () => {
  render(<CardImage/>);
});
