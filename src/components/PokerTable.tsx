import React from "react";
import {Board} from "../lib/rules";
import CommunityCardsOnTable from "./CommunityCardsOnTable";
import {TexasHoldemRoundSettings, WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import Staging from "./Staging";

export default function PokerTable(props: {
  members: string[];
  playerId: string | undefined;
  players: string[] | undefined;
  round: number | undefined;
  board: Board;
  potAmount: number;
  currentRoundFinished: boolean;
  lastWinningResult: WinningResult | undefined;
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => Promise<void>;
}) {
  const {
    members,
    playerId,
    players,
    round,
    board,
    potAmount,
    currentRoundFinished,
    lastWinningResult,
    startGame,
  } = props;
  return (
    <div className="table" data-testid="table">
      {
        (players && board) &&
          <CommunityCardsOnTable board={board} potAmount={potAmount} currentRoundFinished={currentRoundFinished}
                                 lastWinningResult={lastWinningResult}/>
      }
      {
        (currentRoundFinished && playerId) &&
          <Staging
              round={round}
              playerId={playerId}
              members={members}
              startGame={(settings) => {
                startGame(settings).catch(e => console.error(e));
              }}
          />
      }
    </div>
  );
}
