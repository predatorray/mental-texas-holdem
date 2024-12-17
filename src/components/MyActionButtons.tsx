import {Board, Hole} from "../lib/rules";
import React from "react";
import ActionButtons from "./ActionButtons";

export default function MyActionButtons(props: {
  playerId?: string;
  players?: string[];
  whoseTurnAndCallAmount: {
    whoseTurn: string;
    callAmount: number;
  } | null;
  hole?: Hole;
  board: Board;
  currentRoundFinished: boolean;
  potAmount: number;
  bankrolls: Map<string, number>;
  fireBet: (amount: number) => void;
  fireFold: () => void;
}) {
  const {
    playerId,
    players,
    whoseTurnAndCallAmount,
    hole,
    board,
    currentRoundFinished,
    potAmount,
    bankrolls,
    fireBet,
    fireFold,
  } = props;

  if (!playerId || !players || whoseTurnAndCallAmount?.whoseTurn !== playerId || !board || !hole || currentRoundFinished) {
    return <></>;
  }

  return <ActionButtons
    potAmount={potAmount}
    bankroll={bankrolls.get(playerId) ?? 0}
    fireBet={fireBet}
    fireFold={fireFold}
    callAmount={whoseTurnAndCallAmount?.callAmount ?? 0}
  />;
}