import {Hole} from "../lib/rules";
import React from "react";
import HandCards from "./HandCards";

export default function MyHandCards(props: {
  hole?: Hole;
}) {
  if (!props.hole) {
    return <></>;
  }
  return <HandCards hole={props.hole}/>;
}
