import React from 'react';
import { render } from '@testing-library/react';
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";

test('rendering does not crash', () => {
  render(<ScoreBoardAndToggle
    scoreBoard={new Map()}
    totalDebt={new Map()}
    bankrolls={new Map()}
    names={new Map()}/>);
});
