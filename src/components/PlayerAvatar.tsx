import Avatar from "./Avatar";
import React from "react";

export default function PlayerAvatar(props: {
  playerId: string;
  highlight?: boolean;
  title?: string;
} & ({
  playerName: string;
} | {
  children: React.ReactNode;
} | {})) {
  if ('playerName' in props) {
    return <div className="player-avatar" title={props.title ?? props.playerName}>
      <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
      <div className="avatar-label">{props.playerName}</div>
    </div>;
  }
  if ('children' in props) {
    return <div className="player-avatar" title={props.title}>
      <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
      <div className="avatar-label">{props.children}</div>
    </div>;
  }
  return <Avatar title={props.title} highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>;
}
