import React from 'react';

import './App.css';

import CardImage from './components/CardImage';
import useTexasHoldem from './lib/texas-holdem/useTexasHoldem';
import { useSearchParams } from 'react-router-dom';

function App() {
  const params = new URL(document.location.toString()).searchParams;
  const gameRoomId = params.get('gameRoomId');
  const {
    peerState,
    playerId,
    players,
    amountsPerPlayer,
    pot,
    hole,
    board,
    startGame,
    whoseTurn,
    smallBlind,
    bigBlind,
  } = useTexasHoldem({
    gameRoomId: gameRoomId || undefined,
  });
  return (
    <div className="App">
      <div className="community-cards">
        {
          (() => {
            if (peerState !== 'opened') {
              return <>Connecting...</>;
            } else if (players === undefined) {
              return gameRoomId ? <>Waiting for the host to start the game...</> : <button onClick={() => startGame()}>start</button>;
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
      
      <div className="hand-cards">
        {
          playerId && whoseTurn === playerId && (
            <div>
              <button>call</button>
              <button>fold</button>
            </div>
          )
        }
        {
          playerId && smallBlind === playerId && (
            <div>SB</div>
          )
        }
        {
          playerId && bigBlind === playerId && (
            <div>BB</div>
          )
        }
        {
          hole && (
            <>
              <CardImage card={hole[0]}/>
              <CardImage card={hole[1]}/>
            </>
          )
        }
      </div>
    </div>
  );
}

export default App;
