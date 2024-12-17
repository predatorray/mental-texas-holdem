import {TexasHoldemRoundSettings} from "../lib/texas-holdem/TexasHoldemGameRoom";
import React, {useMemo, useState} from "react";
import {HostId} from "../lib/setup";
import Invitation from "./Invitation";

export default function Staging(props: {
  round: number | undefined;
  playerId: string;
  members: string[];
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => void;
}) {
  const {
    members,
  } = props;

  const enoughMembersToPlay = useMemo(() => members.length > 1, [members]);

  const [initialFundAmountInput, setInitialFundAmountInput] = useState('100');
  const initialFundAmount = useMemo(() => parseInt(initialFundAmountInput), [initialFundAmountInput]);
  const [bits, setBits] = useState(32);

  if (HostId) {
    return (
      <div className="staging" data-testid="staging">
        <p>Waiting for the host to start the game...</p>
      </div>
    );
  }

  return (
    <div className="staging host" data-testid="staging">
      {
        props.round ? (
          <>
            <Invitation hostPlayerId={props.playerId} />
            {enoughMembersToPlay
              ? <button
                className="action-button start-button"
                onClick={() => props.startGame({bits, initialFundAmount})}
                data-testid="continue-button"
              >continue</button>
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
                <input type="text" readOnly={true} disabled={true} value="1" data-testid="sb-input"/>
              </div>
              <div className="input-group">
                <label>Big Blind ($)</label>
                <input type="text" readOnly={true} disabled={true} value="2" data-testid="bb-input"/>
              </div>
            </div>
            <div className="input-group">
              <label>Initial Amount ($)</label>
              <input
                type="number"
                value={initialFundAmountInput}
                onChange={(e) => setInitialFundAmountInput(e.target.value)}
                data-testid="initial-fund-amount-input"
              />
            </div>
            <div className="input-group">
              <label>Encryption Key Length (bits)</label>
              <select value={bits} onChange={(e) => setBits(Number(e.target.value))} data-testid="encryption-key-length-option">
                <option value={32}>32</option>
                <option value={64}>64</option>
                <option value={128}>128</option>
              </select>
            </div>
            <Invitation hostPlayerId={props.playerId}/>
            {enoughMembersToPlay
              ? <button
                className="action-button start-button"
                onClick={() => props.startGame({bits, initialFundAmount})}
                data-testid="start-button"
              >start</button>
              : <p>Needs 1 more player to start...</p>
            }
          </>
        )
      }
    </div>
  );
}