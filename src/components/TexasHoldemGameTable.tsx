import React, {useCallback, useMemo, useState} from 'react';

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
import RoomLink from "./RoomLink";

function Invitation(props: {
  hostPlayerId: string;
}) {
  return (
    <div className="invitation">
      <span>Invite others by sharing this link: </span>
      <RoomLink hostPlayerId={props.hostPlayerId}/>
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
  members: string[];
  startGame: () => void;
}) {
  const {
    members,
  } = props;
  const enoughMembersToPlay = useMemo(() => members.length > 1, [members]);
  if (HostId) {
    return (
      <div className="staging">
        <p>Waiting for the host to start the game...</p>
      </div>
    );
  }
  return (
    <div className="staging host">
      {
        props.round ? (
          <>
            <Invitation hostPlayerId={props.playerId} />
            {enoughMembersToPlay
              ? <button className="action-button start-button" onClick={() => props.startGame()}>continue</button>
              : <p>Needs 1 more player to start...</p>
            }
          </>
        ) : (
          <>
            <h4>Game Settings</h4>
            <hr/>
            <div className="input-group">
              <div className="input-group">
                <label>Small Blind ($)</label>
                <input type="text" readOnly={true} value="1"/>
              </div>
              <div className="input-group">
                <label>Big Blind ($)</label>
                <input type="text" readOnly={true} value="2"/>
              </div>
            </div>
            <div className="input-group">
              <label>Initial Amount ($)</label>
              <input type="number" value="100"/>
            </div>
            <div className="input-group">
              <label>Encryption Key Length (bits)</label>
              <select>
                <option selected={true}>32</option>
                <option>64</option>
              </select>
            </div>
            <Invitation hostPlayerId={props.playerId}/>
            {enoughMembersToPlay
              ? <button className="action-button start-button" onClick={() => props.startGame()} disabled={!enoughMembersToPlay}>start</button>
              : <p>Needs 1 more player to start...</p>
            }
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

function MyPlayerAvatar(props: {
  playerId: string | undefined;
  names: Map<string, string>;
  setMyName: (name: string) => void;
}) {
  const {
    playerId,
    names,
    setMyName,
  } = props;

  const [nameInputValue, setNameInputValue] = useState('');

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(e => {
    setNameInputValue(e.target.value);
  }, []);

  const handleInputKeyUp: React.KeyboardEventHandler<HTMLInputElement>  = useCallback(e => {
    if (e.key === 'Enter' && nameInputValue) {
      setChangingName(false);
      setMyName(nameInputValue);
    }
  }, [setMyName, nameInputValue]);

  const [changingName, setChangingName] = useState<boolean>(false);

  if (!playerId) {
    return <></>;
  }

  const playerName = names.get(playerId);
  if (playerName && !changingName) {
    return (
      <PlayerAvatar playerId={playerId}>
        <span className="clickable" onClick={() => setChangingName(true)}>{playerName}</span>
      </PlayerAvatar>
    );
  }

  return (
    <PlayerAvatar playerId={playerId}>
      <input className="name-input"
             type="text"
             placeholder="Enter your name..."
             value={nameInputValue}
             onChange={handleInputChange}
             onKeyUp={handleInputKeyUp}
             onFocus={(e) => e.target.setSelectionRange(0, e.target.value.length)}
             autoFocus={true}/>
    </PlayerAvatar>
  );
}

function MyBetAmount(props: {
  playerId?: string;
  actionsDone: Map<string, string | number> | null;
}) {
  const {
    playerId,
    actionsDone,
  } = props;
  if (!playerId || !actionsDone) {
    return <></>;
  }
  return <BetAmount playerId={playerId} actionsDone={actionsDone}/>;
}

function MyBankroll(props: {
  playerId?: string;
  players?: string[];
  bankrolls: Map<string, number>;
}) {
  if (!props.playerId || !props.players) {
    return <></>;
  }
  return <div className="bankroll">${props.bankrolls.get(props.playerId ?? '') ?? 0}</div>;
}

function MyActionButtons(props: {
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

function MyHandCards(props: {
  hole?: Hole;
}) {
  if (!props.hole) {
    return <></>;
  }
  return <HandCards hole={props.hole}/>;
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
      {
        (!players && playerId) && (
          <div className="opponents">
            {
              members.filter(member => member !== playerId).map((member) => (
                <div key={member} className="opponent">
                  <PlayerAvatar playerId={member} playerName={names.get(member)}/>
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
                    <PlayerAvatar playerId={opponent} playerName={names.get(opponent)} highlight={whoseTurnAndCallAmount?.whoseTurn === opponent}/>
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
                members={members}
                startGame={() => {startGame().catch(e => console.error(e));}}
            />
        }
      </div>
      <div className={iAmWinner ? 'hand-cards winner' : 'hand-cards'}>
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
      { playerId && <MessageBar
          playerId={playerId}
          names={names}
          eventLogs={eventLogs}
          messages={messages}
          onMessage={sendMessage} /> }
    </div>
  );
}