import React from 'react';
import { render } from '@testing-library/react';
import Modal from "./Modal";

test('rendering does not crash', () => {
  render(<Modal/>);
});
