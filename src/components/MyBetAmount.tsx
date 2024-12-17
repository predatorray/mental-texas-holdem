import React from "react";
import BetAmount from "./BetAmount";

export default function MyBetAmount(props: {
  playerId?: string;
  actionsDone: Map<string, string | number> | null;
}) {
  const {
    playerId,
    actionsDone,
  } = props;
  if (!playerId || !actionsDone) {
    return <></>;
  }
  return <BetAmount playerId={playerId} actionsDone={actionsDone}/>;
}
