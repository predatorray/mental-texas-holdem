import { StandardCard } from "mental-poker-toolkit";
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

// function toPheCard(card: StandardCard): string {
//   return `${card.rank}${card.suit.charAt(0).toLowerCase()}`;
// }

// export function evaluateAndRank(holes: {[playerId: string]: Hole}, community: River): EvaluationAndRanking {
//   return Array.from(Object.entries(holes)).map(([playerId, hole]) => {
//     const hand = [...hole, ...community];
//     const pheCards = hand.map(card => toPheCard(card));
//     const strength = evaluateCards(pheCards);
//     const handValue = rankCards(pheCards);
//     return {
//       playerId,
//       strength,
//       handValue,
//     };
//   }).sort((a, b) => a.strength - b.strength);
// }
