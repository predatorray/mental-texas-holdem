import {StandardCard} from "mental-poker-toolkit";

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
