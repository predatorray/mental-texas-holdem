import React from 'react';
import { render } from '@testing-library/react';
import ChipImage from "./ChipImage";

test('rendering does not crash', () => {
  render(<ChipImage/>);
});
