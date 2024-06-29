declare module 'phe';

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

type HandValueDescription =
  | 'STRAIGHT_FLUSH'
  | 'FOUR_OF_A_KIND'
  | 'FULL_HOUSE'
  | 'FLUSH'
  | 'STRAIGHT'
  | 'THREE_OF_A_KIND'
  | 'TWO_PAIR'
  | 'ONE_PAIR'
  | 'HIGH_CARD'
;

export const rankDescription: HandValueDescription[];

export function evaluateCards(cards: Array<String>): number;

export function rankCards(cards: Array<String>): HandValue;
