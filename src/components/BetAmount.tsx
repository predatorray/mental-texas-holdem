import ChipImage from "./ChipImage";
import React from "react";

export default function BetAmount(props: {
  playerId: string;
  actionsDone: Map<string, number | string>;
}) {
  const actionDone = props.actionsDone.get(props.playerId);
  return (actionDone) ? (
    <div className="bet-amount" data-testid="bet-amount">
      {
        (typeof actionDone !== 'string')
          ? <><ChipImage/> ${actionDone}</>
          : actionDone
      }
    </div>
  ) : <></>;
}
