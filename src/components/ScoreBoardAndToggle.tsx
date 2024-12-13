import React, {useState} from "react";
import Modal from "./Modal";
import PlayerAvatar from "./PlayerAvatar";

export default function ScoreBoardAndToggle(props: {
  scoreBoard: Map<string, number>;
  totalDebt: Map<string, number>;
  bankrolls: Map<string, number>;
  names: Map<string, string>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <span className="score-board-toggle" onClick={() => setVisible(true)}>
        <img src={`${process.env.PUBLIC_URL}/podium.svg`} alt="score-board"/>
      </span>
      <Modal visible={visible}>
        <span className="close" onClick={() => setVisible(false)}>&times;</span>
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
              Array.from(props.scoreBoard.entries()).map(([player, score], i) =>
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
