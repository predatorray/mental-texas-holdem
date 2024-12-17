import {Board} from "../lib/rules";
import CardImage from "./CardImage";
import React from "react";

export default function CommunityCards(props: {
  board: Board;
}) {
  return (
    <div className="community-cards">
      <CardImage card={props.board[0]} data-testid="board-card-0"/>
      <CardImage card={props.board[1]} data-testid="board-card-1"/>
      <CardImage card={props.board[2]} data-testid="board-card-2"/>
      <CardImage card={props.board[3]} data-testid="board-card-3"/>
      <CardImage card={props.board[4]} data-testid="board-card-4"/>
    </div>
  );
}
