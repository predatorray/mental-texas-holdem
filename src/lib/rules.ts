import {StandardCard} from "mental-poker-toolkit";
import {combination} from "./utils";
import {evaluateCards} from "phe";

export const CARDS = 52;

export type Hole = [StandardCard, StandardCard];

export type Preflop = [];
export type Flop = [StandardCard, StandardCard, StandardCard];
export type Turn = [StandardCard, StandardCard, StandardCard, StandardCard];
export type River = [StandardCard, StandardCard, StandardCard, StandardCard, StandardCard];

export type Board =
  | Preflop
  | Flop
  | Turn
  | River
;

export function evaluateStandardCards(cards: StandardCard[]) {
  return evaluateCards(cards.map(card => card.rank + card.suit.charAt(0).toLowerCase()));
}

const FIVE_COMBINATION_OF_SEVEN_CARDS = combination([0, 1, 2, 3, 4, 5, 6], 5);

export function calculateEffectiveCardOffsets(
  boardAndHole: StandardCard[],
  strength: number,
  evaluate: (cards: StandardCard[]) => number = evaluateStandardCards,
): number[] | null {
  for (let fiveCardOffsets of FIVE_COMBINATION_OF_SEVEN_CARDS) {
    const fiveCards = boardAndHole.filter((_, i) => fiveCardOffsets.includes(i));
    const eachStrength = evaluate(fiveCards);
    if (eachStrength === strength) {
      return fiveCardOffsets;
    }
  }
  return null;
}
