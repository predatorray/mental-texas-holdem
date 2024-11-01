import React, { useState } from 'react';

import './App.css';

import CardImage from './components/CardImage';
import useTexasHoldem from './lib/texas-holdem/useTexasHoldem';
import TexasHoldemGameRoom from "./lib/texas-holdem/TexasHoldemGameRoom";

function App() {
  const {
    peerState,
    playerId,
    players,
    hole,
    board,
    whoseTurn,
    smallBlind,
    bigBlind,
    startGame,
    bankrolls,
    potAmount,
    totalBetsPerPlayer,
    showdownResultOfLastRound,
    actions,
  } = useTexasHoldem();
  const [betAmount, setBetAmount] = useState<string>('0');
  return (
    <div className="App">
      <div className="table">
        {
          players ? <div>Pot: ${potAmount}</div> : <></>
        }
        <div className="community-cards">
          {
            (() => {
              if (players === undefined) {
                const roomLink = (() => {
                  if (!playerId) {
                    return null;
                  }
                  if (TexasHoldemGameRoom.hostId) {
                    return window.location.href;
                  }
                  return `${window.location.href}?gameRoomId=${playerId}`;
                })();
                return TexasHoldemGameRoom.hostId
                  ? (
                    <>
                      <p>Share the link: {roomLink ? <a href={roomLink} target="_blank">{roomLink}</a> : '...'}</p>
                      <p>Waiting for the host to start the game...</p>
                    </>
                  )
                  : (
                    <>
                      <p>Share the link: {roomLink ? <a href={roomLink} target="_blank">{roomLink}</a> : '...'}</p>
                      <button onClick={() => startGame()}>start</button>
                    </>
                  );
              } else if (hole && board) {
                return (
                  <>
                    <CardImage card={board[0]}/>
                    <CardImage card={board[1]}/>
                    <CardImage card={board[2]}/>
                    <CardImage card={board[3]}/>
                    <CardImage card={board[4]}/>
                  </>
                );
              } else {
                return <>Shuffling...</>;
              }
            })()
          }
        </div>
      </div>
      
      <div className="hand-cards">
        {
          players && playerId && whoseTurn === playerId ? (
            <div>
              <input type="text" value={betAmount} onChange={(e) => {
                setBetAmount(e.target.value);
              }}></input>
              <button onClick={() => {
                actions.fireBet(Number(betAmount));
                setBetAmount('0');
              }}>call</button>
              <button onClick={() => {
                actions.fireFold();
                setBetAmount('0');
              }}>fold</button>
            </div>
          ) : <></>
        }
        {
          players && playerId && smallBlind === playerId ? (
            <div>SB</div>
          ) : <></>
        }
        {
          players && playerId && bigBlind === playerId ? (
            <div>BB</div>
          ) : <></>
        }
        {
          bankrolls && playerId && bankrolls.get(playerId) !== undefined ? (
            <div>Bankroll: ${bankrolls.get(playerId)}</div>
          ) : <></>
        }
        {
          players && totalBetsPerPlayer && playerId && totalBetsPerPlayer.get(playerId) !== undefined ? (
            <div>Bet: ${totalBetsPerPlayer.get(playerId)}</div>
          ) : <></>
        }
        {
          hole ? (
            <>
              <CardImage card={hole[0]}/>
              <CardImage card={hole[1]}/>
            </>
          ) : <></>
        }
      </div>
    </div>
  );
}

export default App;
