import React from 'react';
import { render } from '@testing-library/react';
import ActionButton from "./ActionButton";

test('rendering does not crash', () => {
  render(<ActionButton>Text</ActionButton>);
});
