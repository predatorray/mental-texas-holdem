import React from 'react';

import './App.css';

import CardImage from "./components/CardImage";
import ChipImage from "./components/ChipImage";
import Avatar from "./components/Avatar";
import ActionButton from "./components/ActionButton";

export default function AppSample() {
  return (
    <div className="App">
      <div className="opponents">
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/A.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
        </div>
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/B.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
        </div>
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/C.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
        </div>
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/G.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
        </div>
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/H.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
        </div>
        <div className="opponent">
          <Avatar src="https://api.multiavatar.com/I.svg"/>
          <div className="bankroll">$1,000</div>
          <CardImage card={null}/>
          <CardImage card={null}/>
          <div className="bet-amount">
            <ChipImage/> $10
          </div>
        </div>
      </div>
      <div className="table">
        <div className="pot">
        <ChipImage/> $100
        </div>
        <div className="community-cards">
          <CardImage card={{suit: 'Heart', rank: 'A'}}/>
          <CardImage card={{suit: 'Heart', rank: 'K'}}/>
          <CardImage card={{suit: 'Heart', rank: 'Q'}}/>
          <CardImage card={{suit: 'Heart', rank: 'J'}}/>
          <CardImage card={{suit: 'Heart', rank: 'T'}}/>
        </div>
      </div>

      <div className="hand-cards">
        <div className="bet-amount">
          <ChipImage/> $10
        </div>
        <div className="actions">
          <ActionButton className="action-call">CALL</ActionButton>
          <ActionButton className="action-raise">RAISE<br/>1/2 pot</ActionButton>
          <ActionButton className="action-raise">RAISE<br/>1 pot</ActionButton>
          <ActionButton className="action-raise">RAISE<br/>2 pot</ActionButton>
          <ActionButton className="action-all-in">ALL-IN</ActionButton>
          <ActionButton className="action-fold">FOLD</ActionButton>
        </div>

        <Avatar src="https://api.multiavatar.com/Z.svg"/>
        <div className="bankroll">$1,000</div>

        <CardImage card={{suit: 'Club', rank: 'A'}}/>
        <CardImage card={{suit: 'Spade', rank: 'K'}}/>
      </div>
    </div>
  );
}