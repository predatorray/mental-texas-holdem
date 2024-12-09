import React, {useCallback, useMemo} from 'react';

import '../App.css';

import CardImage from "./CardImage";
import ChipImage from "./ChipImage";
import ActionButton from "./ActionButton";
import useTexasHoldem from "../lib/texas-holdem/useTexasHoldem";
import {Board, Hole} from "../lib/rules";
import {HostId} from "../lib/setup";
import {WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import {rankDescription} from "phe";
import PlayerAvatar from "./PlayerAvatar";
import MessageBar from "./MessageBar";
import useChatRoom from "../lib/useChatRoom";
import useEventLogs from "../lib/texas-holdem/useEventLogs";
import GithubProjectLink from "./GithubProjectLink";
import ScoreBoardAndToggle from "./ScoreBoardAndToggle";

function RoomLink(props: {
  playerId: string;
}) {
  const roomLink = HostId
    ? window.location.href
    : `${window.location.href}?gameRoomId=${props.playerId}`;
  return (
    <div className="room-link">
      Invite others by sharing this link below:<br/>
      <a
        href={roomLink}
        target="_blank"
        rel="noreferrer">{roomLink}
      </a>
    </div>
  );
}

function CommunityCards(props: {
  board: Board;
}) {
  return (
    <div className="community-cards">
      <CardImage card={props.board[0]}/>
      <CardImage card={props.board[1]}/>
      <CardImage card={props.board[2]}/>
      <CardImage card={props.board[3]}/>
      <CardImage card={props.board[4]}/>
    </div>
  );
}

function HandCards(props: {
  hole?: Hole;
}) {
  return (
    <>
      <CardImage card={props.hole?.[0]}/>
      <CardImage card={props.hole?.[1]}/>
    </>
  )
}

function Staging(props: {
  round: number | undefined;
  playerId: string;
  startGame: () => void;
}) {
  return (
    <div className="staging">
      {
        HostId ? (
          <>
            <p>Waiting for the host to start the game...</p>
          </>
        ) : (
          <>
            <button className="action-button start-button" onClick={() => props.startGame()}>
              {props.round ? 'continue' : 'start'}
            </button>
            <RoomLink playerId={props.playerId} />
          </>
        )
      }
    </div>
  );
}

function CommunityCardsOnTable(props: {
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
      <div className="pot">
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

function ActionButtons(props: {
  potAmount: number;
  bankroll: number;
  callAmount: number;
  fireBet: (amount: number) => void;
  fireFold: () => void;
}) {
  const {
    fireBet,
    fireFold,
    bankroll,
    potAmount,
    callAmount,
  } = props;

  const checkOrCall = useCallback(() => {
    fireBet(callAmount);
  }, [fireBet, callAmount]);
  const raiseUpToHalfPot =  useCallback(() => {
    fireBet(Math.ceil(potAmount / 2));
  }, [fireBet, potAmount]);
  const raiseUpToPot =  useCallback(() => {
    fireBet(potAmount);
  }, [fireBet, potAmount]);
  const raiseUpToTwicePot =  useCallback(() => {
    fireBet(potAmount * 2);
  }, [fireBet, potAmount]);
  const allIn =  useCallback(() => {
    fireBet(bankroll);
  }, [fireBet, bankroll]);

  const fold = useCallback(() => {
    fireFold();
  }, [fireFold]);
  return (
    <div className="actions">
      <ActionButton className="action-check-or-call" onClick={checkOrCall}>
        {
          callAmount === 0 ? 'CHECK' : <>CALL<br/>${callAmount}</>
        }
      </ActionButton>
      {
        callAmount <= Math.ceil(potAmount / 2) && <ActionButton className="action-raise" onClick={raiseUpToHalfPot}>RAISE<br/>1/2 pot</ActionButton>
      }
      {
        callAmount <= potAmount && <ActionButton className="action-raise" onClick={raiseUpToPot}>RAISE<br/>1 pot</ActionButton>
      }
      {
        callAmount <= (potAmount * 2) &&  <ActionButton className="action-raise" onClick={raiseUpToTwicePot}>RAISE<br/>2 pot</ActionButton>
      }
      <ActionButton className="action-all-in" onClick={allIn}>ALL-IN</ActionButton>
      {
        callAmount > 0 && <ActionButton className="action-fold" onClick={fold}>FOLD</ActionButton>
      }
    </div>
  );
}

function BetAmount(props: {
  playerId: string;
  actionsDone: Map<string, number | string>;
}) {
  const actionDone = props.actionsDone.get(props.playerId);
  return (actionDone) ? (
    <div className="bet-amount">
      {
        (typeof actionDone !== 'string')
          ? <><ChipImage/> ${actionDone}</>
          : actionDone
      }
    </div>
  ) : <></>;
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

  const iAmWinner = useMemo(() => {
    if (!mainPotWinners || !playerId) {
      return false;
    }
    return mainPotWinners.has(playerId);
  }, [mainPotWinners, playerId]);

  const {
    messages,
    sendMessage,
  } = useChatRoom();

  const eventLogs = useEventLogs();

  return (
    <div className="App">
      <GithubProjectLink/>
      {
        (currentRoundFinished && playerId && round) &&
          <ScoreBoardAndToggle scoreBoard={scoreBoard} totalDebt={totalDebt} bankrolls={bankrolls}/>
      }
      {
        (!players && playerId) && (
          <div className="opponents">
            {
              members.filter(member => member !== playerId).map((member) => (
                <div key={member} className="opponent">
                  <PlayerAvatar playerId={member}/>
                </div>
              ))
            }
          </div>
        )
      }
      {
        players && (
          <div className="opponents">
            {((): React.ReactElement[] => {
              const myOffset = players.findIndex(p => p === playerId);
              const playersStartingAfterMe = myOffset < 0
                ? [...players]
                : [...players.slice(myOffset + 1), ...players.slice(0, myOffset)];
              return playersStartingAfterMe
                .filter(p => p !== playerId)
                .map((opponent) => (
                  <div key={opponent} className={mainPotWinners && mainPotWinners.has(opponent) ? 'opponent winner' : 'opponent'}>
                    <PlayerAvatar playerId={opponent} highlight={whoseTurnAndCallAmount?.whoseTurn === opponent}/>
                    {players && <div className="bankroll">${bankrolls.get(opponent) ?? 0}</div>}
                    {board && <HandCards hole={holesPerPlayer?.get(opponent)}/>}
                    {
                      actionsDone && <BetAmount playerId={opponent} actionsDone={actionsDone}/>
                    }
                  </div>
                ));
            })()}
          </div>
        )
      }
      <div className="table">
        {
          (players && board) && <CommunityCardsOnTable board={board} potAmount={potAmount} currentRoundFinished={currentRoundFinished} lastWinningResult={lastWinningResult}/>
        }
        {
          (currentRoundFinished && playerId) &&
            <Staging
                round={round}
                playerId={playerId}
                startGame={() => {startGame().catch(e => console.error(e));}}
            />
        }
      </div>
      <div className={iAmWinner ? 'hand-cards winner' : 'hand-cards'}>
        {
          (playerId && actionsDone) && <BetAmount playerId={playerId} actionsDone={actionsDone}/>
        }
        {
          (playerId && players && whoseTurnAndCallAmount?.whoseTurn === playerId && board && hole && !currentRoundFinished) && <ActionButtons
                potAmount={potAmount}
                bankroll={bankrolls.get(playerId) ?? 0}
                fireBet={actions.fireBet}
                fireFold={actions.fireFold}
                callAmount={whoseTurnAndCallAmount?.callAmount ?? 0}
            />
        }

        {playerId && <PlayerAvatar playerId={playerId}/>}
        {playerId && players && <div className="bankroll">${bankrolls.get(playerId) ?? 0}</div>}

        {hole && <HandCards hole={hole}/>}
      </div>
      { playerId && <MessageBar playerId={playerId} eventLogs={eventLogs} messages={messages} onMessage={sendMessage} /> }
    </div>
  );
}