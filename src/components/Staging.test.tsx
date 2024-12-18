import {render} from "@testing-library/react";
import Staging from "./Staging";

test('rendering does not crash', () => {
  render(<Staging
    round={1}
    playerId={'player1'}
    members={[]}
    startGame={() => {}}
  />);
});
