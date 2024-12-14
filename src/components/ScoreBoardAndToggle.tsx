import React, {useState} from "react";
import Modal from "./Modal";
import PlayerAvatar from "./PlayerAvatar";

export default function ScoreBoardAndToggle(props: {
  scoreBoard: Map<string, number>;
  totalDebt: Map<string, number>;
  bankrolls: Map<string, number>;
  names: Map<string, string>;

  toggleDataTestId?: string;
  scoreBoardDataTestId?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <span className="score-board-toggle" onClick={() => setVisible(true)} data-testid={props.toggleDataTestId ?? 'score-board-toggle'}>
        <img src={`${process.env.PUBLIC_URL}/podium.svg`} alt="score-board"/>
      </span>
      <Modal visible={visible} data-testid={props.scoreBoardDataTestId}>
        <span className="close" onClick={() => setVisible(false)} data-testid="modal-close">&times;</span>
        <div className="score-board">
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
              Array.from(props.scoreBoard.entries()).sort(([p1, s1], [p2, s2]) => s2 - s1).map(([player, score], i) =>
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
