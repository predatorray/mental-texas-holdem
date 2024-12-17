import PlayerAvatar from "./PlayerAvatar";
import React from "react";
import HandCards from "./HandCards";
import BetAmount from "./BetAmount";
import {Board, Hole} from "../lib/rules";

export default function Opponents(props: {
  members: string[];
  playerId: string | undefined;
  players: string[] | undefined;
  names: Map<string, string>;
  bankrolls: Map<string, number>;
  board: Board;
  whoseTurn: string | undefined;
  holesPerPlayer: Map<string, Hole> | undefined;
  mainPotWinners: Set<string> | null;
  actionsDone: Map<string, string | number> | null;
}) {
  const {
    members,
    playerId,
    players,
    names,
    bankrolls,
    board,
    whoseTurn,
    holesPerPlayer,
    mainPotWinners,
    actionsDone,
  } = props;
  return (
    <>
      {
        (!players && playerId) && (
          <div className="opponents" data-testid="opponents">
            {
              members.filter(member => member !== playerId).map((member, i) => (
                <div key={member} className="opponent" data-testid={`opponent-${i}`}>
                  <PlayerAvatar playerId={member} playerName={names.get(member)}/>
                </div>
              ))
            }
          </div>
        )
      }
      {
        players && (
          <div className="opponents" data-testid="opponents">
            {((): React.ReactElement[] => {
              const myOffset = players.findIndex(p => p === playerId);
              const playersStartingAfterMe = myOffset < 0
                ? [...players]
                : [...players.slice(myOffset + 1), ...players.slice(0, myOffset)];
              return playersStartingAfterMe
                .filter(p => p !== playerId)
                .map((opponent, i) => (
                  <div
                    key={opponent}
                    className={mainPotWinners && mainPotWinners.has(opponent) ? 'opponent winner' : 'opponent'}
                    data-testid={`opponent-${i}`}
                  >
                    <PlayerAvatar playerId={opponent} playerName={names.get(opponent)} highlight={whoseTurn === opponent}/>
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
    </>
  );
}
