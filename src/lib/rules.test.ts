import {calculateEffectiveCardOffsets, evaluateStandardCards} from "./rules";

test('calculateEffectiveCardOffsets', () => {
  const strengthOfFullHouse = evaluateStandardCards([
    {suit: 'Heart', rank: '2'},
    {suit: 'Club', rank: 'A'},
    {suit: 'Heart', rank: 'A'},
    {suit: 'Spade', rank: 'A'},
    {suit: 'Spade', rank: '2'},
  ]);
  const effectiveCards = calculateEffectiveCardOffsets([
    {suit: 'Heart', rank: '2'},
    {suit: 'Club', rank: 'A'},
    {suit: 'Heart', rank: 'A'},
    {suit: 'Club', rank: '3'},
    {suit: 'Heart', rank: '8'},
    {suit: 'Spade', rank: 'A'},
    {suit: 'Spade', rank: '2'},
  ], strengthOfFullHouse);

  expect(effectiveCards).toEqual([0, 1, 2, 5, 6]);
});

test('calculateEffectiveCardOffsets without nonexistent strength', () => {
  const evaluate = () => 1;
  const effectiveCards = calculateEffectiveCardOffsets([
    {suit: 'Heart', rank: '2'},
    {suit: 'Club', rank: 'A'},
    {suit: 'Heart', rank: 'A'},
    {suit: 'Club', rank: '3'},
    {suit: 'Heart', rank: '8'},
    {suit: 'Spade', rank: 'A'},
    {suit: 'Spade', rank: '2'},
  ], 2, evaluate);

  expect(effectiveCards).toBeNull();
});
