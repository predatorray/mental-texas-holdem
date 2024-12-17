import React from "react";
import MyActionButtons from "./MyActionButtons";
import MyBetAmount from "./MyBetAmount";
import MyPlayerAvatar from "./MyPlayerAvatar";
import MyBankroll from "./MyBankroll";
import MyHandCards from "./MyHandCards";
import {Board, Hole} from "../lib/rules";

export default function MySeat(props: {
  playerId: string | undefined;
  players: string[] | undefined;
  board: Board;
  hole: Hole | undefined;
  potAmount: number;
  bankrolls: Map<string, number>;
  names: Map<string, string>;
  setMyName: (name: string) => void;
  iAmWinner: boolean;
  currentRoundFinished: boolean;
  actionsDone: Map<string, string | number> | null;
  whoseTurnAndCallAmount: {
    whoseTurn: string;
    callAmount: number;
  } | null;
  actions: {
    fireBet: (amount: number) => Promise<void>;
    fireFold: () => Promise<void>;
  }
}) {
  const {
    playerId,
    players,
    iAmWinner,
    currentRoundFinished,
    actionsDone,
    board,
    hole,
    potAmount,
    bankrolls,
    names,
    setMyName,
    whoseTurnAndCallAmount,
    actions,
  } = props;
  return (
    <div className={iAmWinner ? 'my-seat winner' : 'my-seat'}>
      <MyBetAmount playerId={playerId} actionsDone={actionsDone}/>
      <MyActionButtons
        playerId={playerId}
        players={players}
        whoseTurnAndCallAmount={whoseTurnAndCallAmount}
        board={board}
        hole={hole}
        currentRoundFinished={currentRoundFinished}
        potAmount={potAmount}
        bankrolls={bankrolls}
        fireBet={actions.fireBet}
        fireFold={actions.fireFold}
      />
      <MyPlayerAvatar playerId={playerId} names={names} setMyName={setMyName}/>
      <MyBankroll playerId={playerId} players={players} bankrolls={bankrolls}/>
      <MyHandCards hole={hole}/>
    </div>
  );
}
