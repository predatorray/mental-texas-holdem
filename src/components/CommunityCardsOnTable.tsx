import {WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import {Board} from "../lib/rules";
import {rankDescription} from "phe";
import ChipImage from "./ChipImage";
import React from "react";
import CommunityCards from "./CommunityCards";

export default function CommunityCardsOnTable(props: {
  potAmount: number;
  currentRoundFinished: boolean;
  lastWinningResult?: WinningResult;
  board: Board;
}) {
  const {
    potAmount,
    currentRoundFinished,
    lastWinningResult: winningResult,
    board,
  } = props;
  const winningResultDescription = (currentRoundFinished && winningResult) && (winningResult?.how === 'Showdown'
    ? rankDescription[winningResult.showdown[0].handValue]
    : 'One Player Remaining');
  return (
    <>
      <div className="pot" data-testid="pot">
        {
          winningResultDescription ? (
            winningResultDescription
          ) : (
            <><ChipImage/> ${potAmount}</>
          )
        }
      </div>
      <CommunityCards board={board}/>
    </>
  );
}
