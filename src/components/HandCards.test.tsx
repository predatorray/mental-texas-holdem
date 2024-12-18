import {render} from "@testing-library/react";
import HandCards from "./HandCards";

test('rendering does not crash without hole cards', () => {
  render(<HandCards/>);
});

test('rendering does not crash with hole cards', () => {
  render(<HandCards hole={[
    {suit: 'Diamond', rank: '2'},
    {suit: 'Club', rank: '7'},
  ]}/>);
});
