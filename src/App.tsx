import React from 'react';

import './App.css';

import CardImage from './components/CardImage';
import useTexasHoldem from './lib/useTexasHoldem';
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
    community,
    startGame,
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
            }
            if (!gameRoomId && (!community || !hole)) {
              return (
                <button onClick={() => startGame()}>start</button>
              )
            }
            if (community) {
              return (
                <>
                  <CardImage card={community[0]}/>
                  <CardImage card={community[1]}/>
                  <CardImage card={community[2]}/>
                  <CardImage card={community[3]}/>
                  <CardImage card={community[4]}/>
                </>
              );
            }
          })()
        }
      </div>
      
      <div className="hand-cards">
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
