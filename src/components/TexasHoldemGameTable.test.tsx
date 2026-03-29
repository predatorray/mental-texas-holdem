import React from 'react';
import { render } from '@testing-library/react';
import TexasHoldemGameTable from "./TexasHoldemGameTable";

jest.mock('../lib/setup');

test('rendering does not crash', () => {
  render(<TexasHoldemGameTable />);
});
