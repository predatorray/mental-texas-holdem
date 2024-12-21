import React, {useMemo, useState} from "react";
import Modal from "./Modal";
import PlayerAvatar from "./PlayerAvatar";
import {WinningResult} from "../lib/texas-holdem/TexasHoldemGameRoom";
import {rankDescription} from "phe";
import {Board, calculateEffectiveCardOffsets, Hole} from "../lib/rules";
import CardImage from "./CardImage";

export default function ScoreBoardAndToggle(props: {
  scoreBoard: Map<string, number>;
  totalDebt: Map<string, number>;
  bankrolls: Map<string, number>;
  names: Map<string, string>;
  lastWinningResult: WinningResult | undefined;
  mainPotWinners: Set<string> | null;
  holesPerPlayer: Map<string, Hole> | undefined;
  board: Board;

  toggleDataTestId?: string;
  scoreBoardDataTestId?: string;
}) {
  const [visible, setVisible] = useState(true);

  const winningResultDescription = useMemo(() => {
    if (props.lastWinningResult?.how === 'Showdown') {
      return rankDescription[props.lastWinningResult.showdown[0].handValue];
    } else {
      return 'One Player Remaining';
    }
  }, [props.lastWinningResult]);

  return (
    <>
      <span className="score-board-toggle" onClick={() => setVisible(true)} data-testid={props.toggleDataTestId ?? 'score-board-toggle'}>
        <img src={`${process.env.PUBLIC_URL}/podium.svg`} alt="score-board"/>
      </span>
      <Modal visible={visible} onClick={() => setVisible(false)} data-testid={props.scoreBoardDataTestId}>
        <span className="close" onClick={() => setVisible(false)} data-testid="modal-close">&times;</span>
        <div className="score-board">
          {
            props.mainPotWinners && (
              <>
                <h4>Winner(s)</h4>
                {
                  Array.from(props.mainPotWinners).map((winner, i) => (
                    <PlayerAvatar playerId={winner} key={i} />
                  ))
                }
              </>
            )
          }

          <div className="result-description">{winningResultDescription}</div>

          <table className="score-board-showdown">
            <tbody>
            {
              (() => {
                const lastWinningResult = props.lastWinningResult;
                if (lastWinningResult?.how !== 'Showdown') {
                  return <></>;
                }
                const firstShowdown = lastWinningResult.showdown[0];
                return firstShowdown.players.map((winnerInShowdown, i) => {
                  const hole = props.holesPerPlayer?.get(winnerInShowdown)!;
                  const boardAndHole = [...props.board, ...hole];
                  const effectiveOffsets = calculateEffectiveCardOffsets(boardAndHole, firstShowdown.strength);
                  console.log(effectiveOffsets);
                  return (
                    <tr key={i}>
                      <td><PlayerAvatar playerId={winnerInShowdown}/></td>
                      <td>
                        <div className="community-cards">
                          {
                            [0, 1, 2, 3, 4].map(i => (
                              <CardImage
                                key={i}
                                card={props.board[i]}
                                data-testid={`board-card-${i}`}
                                {... (effectiveOffsets && !effectiveOffsets.includes(i)) && {className: 'ineffective'}}
                              />
                            ))
                          }
                        </div>
                      </td>
                      <td>
                        <div className="hand-cards">
                          <CardImage {... effectiveOffsets && !effectiveOffsets.includes(5) && {className: 'ineffective'}} card={props.holesPerPlayer?.get(winnerInShowdown)?.[0]} data-testid="hand-card-0"/>
                          <CardImage {... effectiveOffsets && !effectiveOffsets.includes(6) && {className: 'ineffective'}} card={props.holesPerPlayer?.get(winnerInShowdown)?.[1]} data-testid="hand-card-1"/>
                        </div>
                      </td>
                    </tr>
                  )
                })
              })()
            }
            </tbody>
          </table>

          <table className="score-board-table">
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">Name</th>
              <th scope="col">Current Bankroll</th>
              <th scope="col">Total</th>
            </tr>
            </thead>
            <tbody>
            {
              Array.from(props.scoreBoard.entries()).sort(([, s1], [, s2]) => s2 - s1).map(([player, score], i) =>
                <tr key={i}>
                  <td><PlayerAvatar playerId={player}/></td>
                  <td>{props.names.get(player) ?? '-'}</td>
                  <td>${Math.abs(props.bankrolls.get(player) ?? 0)}</td>
                  <td>{score >= 0 ? '+' : '-'}${Math.abs(score)}</td>
                </tr>
              )
            }
            </tbody>
          </table>
        </div>
      </Modal>
    </>
  );
}
