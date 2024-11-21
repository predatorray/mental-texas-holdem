import React, {useCallback} from 'react';

import './App.css';

import CardImage from "./components/CardImage";
import ChipImage from "./components/ChipImage";
import Avatar from "./components/Avatar";
import ActionButton from "./components/ActionButton";
import useTexasHoldem from "./lib/texas-holdem/useTexasHoldem";
import useChatRoom from "./lib/useChatRoom";
import {Board, Hole} from "./lib/rules";
import {HostId} from "./lib/setup";
import {WinningResult} from "./lib/texas-holdem/TexasHoldemGameRoom";
import {rankDescription} from "phe";

function RoomLink(props: {
  playerId: string;
}) {
  const roomLink = HostId
    ? window.location.href
    : `${window.location.href}?gameRoomId=${props.playerId}`;
  return <a
    style={{
      position: 'absolute',
      top: 8,
      left: 10,
      color: 'white',
    }}
    href={roomLink}
    target="_blank"
    rel="noreferrer">Share this Link with others.</a>;
}

function PlayerAvatar(props: {
  playerId: string;
  highlight?: boolean;
}) {
  return (
    <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
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
  lastWinningResult?: WinningResult;
  startGame: () => void;
}) {
  return (
    <div className="staging">
      {
        props.lastWinningResult && <div className="winner">
          {((lastWinningResult: WinningResult) => {
            switch (lastWinningResult.how) {
              case 'LastOneWins':
                return <div>
                  <PlayerAvatar playerId={lastWinningResult.winner}/>
                  Won<br></br>
                </div>
              case 'Showdown':
                return (
                  <div>
                    {lastWinningResult.showdown[0].players.map(playerId => <PlayerAvatar playerId={playerId}/>)}
                    <br></br>Won<br></br>
                    ({rankDescription[lastWinningResult.showdown[0].handValue]})
                  </div>
                )
            }
          })(props.lastWinningResult)}
        </div>
      }
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
          </>
        )
      }
    </div>
  );
}

function CommunityCardsOnTable(props: {
  potAmount: number;
  board: Board;
}) {
  return (
    <>
      <div className="pot">
        <ChipImage/> ${props.potAmount}
      </div>
      <CommunityCards board={props.board}/>
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
      <ActionButton className="action-raise" onClick={raiseUpToHalfPot}>RAISE<br/>1/2 pot</ActionButton>
      <ActionButton className="action-raise" onClick={raiseUpToPot}>RAISE<br/>1 pot</ActionButton>
      <ActionButton className="action-raise" onClick={raiseUpToTwicePot}>RAISE<br/>2 pot</ActionButton>
      <ActionButton className="action-all-in" onClick={allIn}>ALL-IN</ActionButton>
      <ActionButton className="action-fold" onClick={fold}>FOLD</ActionButton>
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

export default function App() {
  const {
    peerState,
    playerId,
    players,
    round,
    currentRoundFinished,
    hole,
    holesPerPlayer,
    board,
    whoseTurnAndCallAmount,
    smallBlind,
    bigBlind,
    startGame,
    bankrolls,
    potAmount,
    myBetAmount,
    lastWinningResult,
    actionsDone,
    actions,
  } = useTexasHoldem();
  const messages = useChatRoom();

  return (
    <div className="App">
      { playerId && <RoomLink playerId={playerId}/> }
      {
        players && (
          <div className="opponents">
            {(() => {
              const myOffset = players.findIndex(p => p === playerId);
              return [...players.slice(myOffset + 1), ...players.slice(0, myOffset)]
                .filter(p => p !== playerId)
                .map((opponent) => (
                  <div key={opponent} className="opponent">
                    <PlayerAvatar playerId={opponent} highlight={whoseTurnAndCallAmount?.whoseTurn === opponent}/>
                    {players && <div className="bankroll">${bankrolls.get(opponent) ?? 0}</div>}
                    {hole && board && <HandCards hole={holesPerPlayer?.get(opponent)}/>}
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
          (players && hole && board) && <CommunityCardsOnTable board={board} potAmount={potAmount}/>
        }
        {
          (currentRoundFinished && playerId) &&
            <Staging
                round={round}
                playerId={playerId}
                startGame={() => {startGame().catch(e => console.error(e));}}
                lastWinningResult={lastWinningResult}
            />
        }
      </div>
      <div className="hand-cards">
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
    </div>
  );
}