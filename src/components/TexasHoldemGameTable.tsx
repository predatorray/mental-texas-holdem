import React, {useCallback, useMemo, useState} from 'react';

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
import LobbyPage from "./lobby/LobbyPage";
import {TexasHoldemRoundSettings, WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import {HostId} from "../lib/setup";
import {Board, Hole} from "../lib/rules";
import {EventLogs} from "../lib/texas-holdem/useEventLogs";
import {Messages} from "../lib/useChatRoom";

const DEFAULT_ROUND_SETTINGS: Partial<TexasHoldemRoundSettings> = {bits: 32, initialFundAmount: 100};

/**
 * The in-game screen: opponents on top, the table in the middle, and the
 * player's own seat at the bottom, with the floating chat panel docked to
 * the corner.
 */
export function GameScreen(props: {
  playerId: string | undefined;
  members: string[];
  players: string[] | undefined;
  round: number;
  currentRoundFinished: boolean;
  hole: Hole | undefined;
  holesPerPlayer: Map<string, Hole> | undefined;
  board: Board;
  whoseTurnAndCallAmount: {whoseTurn: string; callAmount: number} | null;
  bankrolls: Map<string, number>;
  scoreBoard: Map<string, number>;
  totalDebt: Map<string, number>;
  potAmount: number;
  lastWinningResult: WinningResult | undefined;
  actionsDone: Map<string, string | number> | null;
  actions: {
    fireBet: (amount: number) => Promise<void>;
    fireFold: () => Promise<void>;
  };
  mainPotWinners: Set<string> | null;
  names: Map<string, string>;
  setMyName: (name: string) => void;
  messages: Messages;
  sendMessage: (message: string) => void;
  eventLogs: EventLogs;
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => Promise<void>;
}) {
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
    bankrolls,
    scoreBoard,
    totalDebt,
    potAmount,
    lastWinningResult,
    actionsDone,
    actions,
    mainPotWinners,
    names,
    setMyName,
    messages,
    sendMessage,
    eventLogs,
    startGame,
  } = props;

  return (
    <div className="App game-screen">
      <GithubProjectLink/>
      {
        (currentRoundFinished && playerId && round) &&
          <ScoreBoardAndToggle
              scoreBoard={scoreBoard}
              totalDebt={totalDebt}
              bankrolls={bankrolls}
              names={names}
              lastWinningResult={lastWinningResult}
              mainPotWinners={mainPotWinners}
              holesPerPlayer={holesPerPlayer}
              board={board}
          />
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
        mainPotWinners={mainPotWinners}
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

  const {
    names,
    setMyName,
    messages,
    sendMessage,
  } = useChatRoom();

  const eventLogs = useEventLogs();

  // Remember the settings chosen in the lobby so that starting the next
  // round ("continue") reuses them instead of falling back to defaults.
  const [savedSettings, setSavedSettings] = useState(DEFAULT_ROUND_SETTINGS);
  const startGameWithSavedSettings = useCallback(
    (settings?: Partial<TexasHoldemRoundSettings>) => {
      if (settings) {
        setSavedSettings(settings);
      }
      return startGame(settings ?? savedSettings);
    },
    [startGame, savedSettings],
  );

  // Before the first round ever starts, show the dedicated lobby page where
  // players gather, chat, and the host configures and starts the game.
  if (round === undefined) {
    return (
      <LobbyPage
        playerId={playerId}
        iAmHost={!HostId}
        hostPlayerId={HostId ?? playerId}
        members={members}
        names={names}
        setMyName={setMyName}
        messages={messages}
        sendMessage={sendMessage}
        eventLogs={eventLogs}
        startGame={startGameWithSavedSettings}
      />
    );
  }

  return (
    <GameScreen
      playerId={playerId}
      members={members}
      players={players}
      round={round}
      currentRoundFinished={currentRoundFinished}
      hole={hole}
      holesPerPlayer={holesPerPlayer}
      board={board}
      whoseTurnAndCallAmount={whoseTurnAndCallAmount}
      bankrolls={bankrolls}
      scoreBoard={scoreBoard}
      totalDebt={totalDebt}
      potAmount={potAmount}
      lastWinningResult={lastWinningResult}
      actionsDone={actionsDone}
      actions={actions}
      mainPotWinners={mainPotWinners}
      names={names}
      setMyName={setMyName}
      messages={messages}
      sendMessage={sendMessage}
      eventLogs={eventLogs}
      startGame={startGameWithSavedSettings}
    />
  );
}
