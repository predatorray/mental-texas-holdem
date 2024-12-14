import React, {act} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";

describe('ScoreBoardAndToggle', () => {
  const scoreBoard = new Map<string, number>();
  scoreBoard.set('p1', -1);
  scoreBoard.set('p2', 1);

  const totalDebt = new Map<string, number>();
  scoreBoard.set('p1', 200);
  scoreBoard.set('p2', 100);

  const bankrolls = new Map<string, number>();
  scoreBoard.set('p1', -50);
  scoreBoard.set('p2', 150);

  const names = new Map<string, string>();
  names.set('p1', 'Alice');

  test('rendering does not crash', () => {

    render(<ScoreBoardAndToggle
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      bankrolls={bankrolls}
      names={names}/>);
  });

  test('opening and hiding the score board', async () => {
    act(() => {
      render(<ScoreBoardAndToggle
        scoreBoard={scoreBoard}
        totalDebt={totalDebt}
        bankrolls={bankrolls}
        names={names}
        scoreBoardDataTestId="score-board"
      />);
    });

    const scoreBoardComponent = await screen.findByTestId('score-board');
    expect(scoreBoardComponent.getAttribute('class')).not.toContain('visible');

    const toggle = await screen.findByTestId('score-board-toggle');
    act(() => {
      fireEvent.click(toggle);
    });

    expect(scoreBoardComponent.getAttribute('class')).toContain('visible');

    act(() => {
      screen.getByTestId('modal-close').click();
    });
    expect(scoreBoardComponent.getAttribute('class')).not.toContain('visible');
  });
});
