import {render} from "@testing-library/react";
import CommunityCards from "./CommunityCards";

test('rendering preflop', () => {
  render(<CommunityCards board={[]}/>);
});

test('rendering flop', () => {
  render(<CommunityCards board={[
    {suit: 'Heart', rank: 'A'},
    {suit: 'Heart', rank: 'K'},
    {suit: 'Heart', rank: 'Q'},
  ]}/>);
});

test('rendering turn', () => {
  render(<CommunityCards board={[
    {suit: 'Heart', rank: 'A'},
    {suit: 'Heart', rank: 'K'},
    {suit: 'Heart', rank: 'Q'},
    {suit: 'Heart', rank: 'J'},
  ]}/>);
});

test('rendering river', () => {
  render(<CommunityCards board={[
    {suit: 'Heart', rank: 'A'},
    {suit: 'Heart', rank: 'K'},
    {suit: 'Heart', rank: 'Q'},
    {suit: 'Heart', rank: 'J'},
    {suit: 'Heart', rank: 'T'},
  ]}/>);
});
