import React, {act} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";

test('rendering does not crash', () => {
  render(<ScoreBoardAndToggle
    scoreBoard={new Map()}
    totalDebt={new Map()}
    bankrolls={new Map()}
    names={new Map()}/>);
});

test('hiding the score board', async () => {
  act(() => {
    render(<ScoreBoardAndToggle
      scoreBoard={new Map()}
      totalDebt={new Map()}
      bankrolls={new Map()}
      names={new Map()}
      scoreBoardDataTestId="score-board"
    />);
  });

  const scoreBoard = await screen.findByTestId('score-board');
  expect(scoreBoard.getAttribute('class')).not.toContain('visible');

  const toggle = await screen.findByTestId('score-board-toggle');
  act(() => {
    fireEvent.click(toggle);
  });

  expect(scoreBoard.getAttribute('class')).toContain('visible');
});
