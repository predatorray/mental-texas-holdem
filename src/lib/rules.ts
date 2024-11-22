import {StandardCard, Suit} from "mental-poker-toolkit";
import {Rank} from "mental-poker-toolkit/build/main/lib/poker";
// import { evaluateCards, rankCards } from "../phe";

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

export enum HandValue {
  STRAIGHT_FLUSH = 0,
  FOUR_OF_A_KIND = 1,
  FULL_HOUSE = 2,
  FLUSH = 3,
  STRAIGHT = 4,
  THREE_OF_A_KIND = 5,
  TWO_PAIR = 6,
  ONE_PAIR = 7,
  HIGH_CARD = 8,
};

export type EvaluationAndRanking = Array<{
  playerId: string;
  strength: number;
  handValue: HandValue;
}>;

const ACE_CODES: {[suit in Suit]: number[]} = {
  Spade: [55356, 56481],
  Heart: [55356, 56497],
  Diamond: [55356, 56513],
  Club: [55356, 56529],
}

const OFFSET_PER_RANK: {[rank in Rank]: number} = {
  A: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
  T: 9,
  J: 10,
  Q: 11,
  K: 12,
};

export function convertToUnicode(card: StandardCard): string {
  return String.fromCharCode(ACE_CODES[card.suit][0], ACE_CODES[card.suit][1] + OFFSET_PER_RANK[card.rank]);
}
