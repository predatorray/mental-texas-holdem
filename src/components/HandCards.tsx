import {Hole} from "../lib/rules";
import CardImage from "./CardImage";
import React from "react";

export default function HandCards(props: {
  hole?: Hole;
}) {
  return (
    <>
      <CardImage card={props.hole?.[0]} data-testid="hand-card-0"/>
      <CardImage card={props.hole?.[1]} data-testid="hand-card-1"/>
    </>
  )
}
