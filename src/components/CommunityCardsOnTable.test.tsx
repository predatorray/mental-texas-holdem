import {render} from "@testing-library/react";
import CommunityCardsOnTable from "./CommunityCardsOnTable";

test('rendering does not crash', () => {
  render(<CommunityCardsOnTable potAmount={100} currentRoundFinished={false} board={[]}/>);
});
