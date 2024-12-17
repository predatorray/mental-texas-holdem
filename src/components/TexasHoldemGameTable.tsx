import React, {useMemo} from 'react';

import '../App.css';

import useTexasHoldem from "../lib/texas-holdem/useTexasHoldem";
import MessageBar from "./MessageBar";
import useChatRoom from "../lib/useChatRoom";
import useEventLogs from "../lib/texas-holdem/useEventLogs";
import GithubProjectLink from "./GithubProjectLink";
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";
import MySeat from "./MySeat";
import PokerTable from "./PokerTable";
import Opponents from "./Opponents";

export default function TexasHoldemGameTable() {
  const {
    playerId,
    members,
    players,
    round,
    currentRoundFinished,
    hole,
    holesPerPlayer,
    board,
    whoseTurnAndCallAmount,
    startGame,
    bankrolls,
    scoreBoard,
    totalDebt,
    potAmount,
    lastWinningResult,
    actionsDone,
    actions,
  } = useTexasHoldem();

  const mainPotWinners = useMemo(() => {
    if (!currentRoundFinished || !lastWinningResult) {
      return null;
    }
    const winners: string[] = [];
    switch (lastWinningResult.how) {
      case 'LastOneWins':
        winners.push(lastWinningResult.winner);
        break
      case 'Showdown':
        winners.push(...lastWinningResult.showdown[0].players);
        break;
    }
    return new Set(winners);
  }, [currentRoundFinished, lastWinningResult]);

  const iAmWinner = useMemo(() => {
    if (!mainPotWinners || !playerId) {
      return false;
    }
    return mainPotWinners.has(playerId);
  }, [mainPotWinners, playerId]);

  const {
    names,
    setMyName,
    messages,
    sendMessage,
  } = useChatRoom();

  const eventLogs = useEventLogs();

  return (
    <div className="App">
      <GithubProjectLink/>
      {
        (currentRoundFinished && playerId && round) &&
          <ScoreBoardAndToggle scoreBoard={scoreBoard} totalDebt={totalDebt} bankrolls={bankrolls} names={names}/>
      }
      <Opponents
        members={members}
        playerId={playerId}
        players={players}
        names={names}
        bankrolls={bankrolls}
        board={board}
        whoseTurn={whoseTurnAndCallAmount?.whoseTurn}
        holesPerPlayer={holesPerPlayer}
        mainPotWinners={mainPotWinners}
        actionsDone={actionsDone}
      />
      <PokerTable
        members={members}
        playerId={playerId}
        players={players}
        round={round}
        board={board}
        potAmount={potAmount}
        currentRoundFinished={currentRoundFinished}
        lastWinningResult={lastWinningResult}
        startGame={startGame}
      />
      <MySeat
        playerId={playerId}
        players={players}
        board={board}
        hole={hole}
        potAmount={potAmount}
        bankrolls={bankrolls}
        names={names}
        setMyName={setMyName}
        iAmWinner={iAmWinner}
        currentRoundFinished={currentRoundFinished}
        actionsDone={actionsDone}
        whoseTurnAndCallAmount={whoseTurnAndCallAmount}
        actions={actions}
      />
      { playerId && <MessageBar
          playerId={playerId}
          names={names}
          eventLogs={eventLogs}
          messages={messages}
          onMessage={sendMessage} /> }
    </div>
  );
}
