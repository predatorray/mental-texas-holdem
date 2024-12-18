import {render} from "@testing-library/react";
import React from "react";
import BetAmount from "./BetAmount";

test('rendering does not crash', () => {
  render(<BetAmount
    playerId="player"
    actionsDone={new Map()}
  />);
});
