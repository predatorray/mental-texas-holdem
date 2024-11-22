import Avatar from "./Avatar";
import React from "react";

export default function PlayerAvatar(props: {
  playerId: string;
  highlight?: boolean;
}) {
  return (
    <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
  );
}
