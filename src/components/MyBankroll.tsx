import React from "react";

export default function MyBankroll(props: {
  playerId?: string;
  players?: string[];
  bankrolls: Map<string, number>;
}) {
  if (!props.playerId || !props.players) {
    return <></>;
  }
  return <div className="bankroll" data-testid="my-bankroll">${props.bankrolls.get(props.playerId ?? '') ?? 0}</div>;
}
