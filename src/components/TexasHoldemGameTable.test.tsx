import React from 'react';
import { render } from '@testing-library/react';
import TexasHoldemGameTable from "./TexasHoldemGameTable";

test('rendering does not crash', () => {
  render(<TexasHoldemGameTable />);
});
