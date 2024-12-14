import Avatar from "./Avatar";
import React from "react";
import DataTestIdAttributes from "../lib/types";

export default function PlayerAvatar(props: DataTestIdAttributes & {
  playerId: string;
  highlight?: boolean;
  title?: string;
} & ({
  playerName: string;
} | {
  children: React.ReactNode;
} | {})) {
  if ('playerName' in props) {
    return <div className="player-avatar" title={props.title ?? props.playerName} data-testid={props['data-testid']}>
      <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
      <div className="avatar-label">{props.playerName}</div>
    </div>;
  }
  if ('children' in props) {
    return <div className="player-avatar" title={props.title} data-testid={props['data-testid']}>
      <Avatar highlight={props.highlight} src={`https://api.multiavatar.com/${props.playerId}.svg`}/>
      <div className="avatar-label">{props.children}</div>
    </div>;
  }
  return <Avatar
    title={props.title}
    highlight={props.highlight}
    src={`https://api.multiavatar.com/${props.playerId}.svg`}
    data-testid={props['data-testid']}
  />;
}
