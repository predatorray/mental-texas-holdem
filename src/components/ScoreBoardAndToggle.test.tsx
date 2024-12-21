import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";
import {ShowdownResult, WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import {evaluateStandardCards, Hole} from "../lib/rules";
import {handRank} from "phe";

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
      names={names}
      lastWinningResult={undefined}
      mainPotWinners={null}
      holesPerPlayer={undefined}
      board={[]}
    />);
  });

  test('rendering with winning result', () => {
    const lastWinningResult: WinningResult = {
      how: 'LastOneWins',
      round: 1,
      winner: 'player1',
    };
    const mainPotWinners = new Set<string>();
    const holesPerPlayer = new Map<string, Hole>();
    holesPerPlayer.set('player1', [
      {suit: 'Diamond', rank: 'A'},
      {suit: 'Spade', rank: 'A'},
    ]);
    holesPerPlayer.set('player2', [
      {suit: 'Diamond', rank: 'K'},
      {suit: 'Spade', rank: 'K'},
    ]);

    mainPotWinners.add('player1');
    render(<ScoreBoardAndToggle
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      bankrolls={bankrolls}
      names={names}
      lastWinningResult={lastWinningResult}
      mainPotWinners={mainPotWinners}
      holesPerPlayer={holesPerPlayer}
      board={[
        {suit: 'Diamond', rank: 'Q'},
        {suit: 'Diamond', rank: 'J'},
        {suit: 'Diamond', rank: 'T'},
      ]}
    />);
  });

  test('rendering with showdown', () => {
    const strength = evaluateStandardCards([
      {suit: 'Diamond', rank: 'A'},
      {suit: 'Diamond', rank: 'K'},
      {suit: 'Diamond', rank: 'Q'},
      {suit: 'Diamond', rank: 'J'},
      {suit: 'Diamond', rank: 'T'},
    ])
    const handValue = handRank(strength);
    const lastWinningResult: ShowdownResult = {
      how: 'Showdown',
      round: 1,
      showdown: [
        {
          strength,
          handValue,
          players: ['player1'],
        }
      ]
    };
    const mainPotWinners = new Set<string>();
    mainPotWinners.add('player1');
    const holesPerPlayer = new Map<string, Hole>();
    holesPerPlayer.set('player1', [
      {suit: 'Diamond', rank: 'A'},
      {suit: 'Diamond', rank: 'K'},
    ]);
    holesPerPlayer.set('player2', [
      {suit: 'Diamond', rank: '2'},
      {suit: 'Spade', rank: '7'},
    ]);

    mainPotWinners.add('player1');
    render(<ScoreBoardAndToggle
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      bankrolls={bankrolls}
      names={names}
      lastWinningResult={lastWinningResult}
      mainPotWinners={mainPotWinners}
      holesPerPlayer={holesPerPlayer}
      board={[
        {suit: 'Diamond', rank: 'Q'},
        {suit: 'Diamond', rank: 'J'},
        {suit: 'Diamond', rank: 'T'},
      ]}
    />);
  });

  test('opening and hiding the score board', async () => {
    render(<ScoreBoardAndToggle
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      bankrolls={bankrolls}
      names={names}
      scoreBoardDataTestId="score-board"
      lastWinningResult={undefined}
      mainPotWinners={null}
      holesPerPlayer={undefined}
      board={[]}
    />);

    fireEvent.click(screen.getByTestId('score-board-toggle'));

    const scoreBoardComponent = await screen.findByTestId('score-board');
    expect(scoreBoardComponent.getAttribute('class')).toContain('visible');

    fireEvent.click(scoreBoardComponent);
    expect(scoreBoardComponent.getAttribute('class')).not.toContain('visible');

    const toggle = await screen.findByTestId('score-board-toggle');
    fireEvent.click(toggle);
    expect(scoreBoardComponent.getAttribute('class')).toContain('visible');
  });

  test('closing the score board by clicking the close button', async () => {
    render(<ScoreBoardAndToggle
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      bankrolls={bankrolls}
      names={names}
      scoreBoardDataTestId="score-board"
      lastWinningResult={undefined}
      mainPotWinners={null}
      holesPerPlayer={undefined}
      board={[]}
    />);

    fireEvent.click(screen.getByTestId('score-board-toggle'));

    const scoreBoardComponent = await screen.findByTestId('score-board');
    expect(scoreBoardComponent.getAttribute('class')).toContain('visible');

    fireEvent.click(screen.getByTestId('modal-close'));
    expect(scoreBoardComponent.getAttribute('class')).not.toContain('visible');
  });
});
