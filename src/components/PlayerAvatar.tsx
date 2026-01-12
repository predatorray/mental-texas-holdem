import Avatar from "./Avatar";
import React from "react";
import DataTestIdAttributes from "../lib/types";
import multiavatar from '@multiavatar/multiavatar';

function generateAvatarForSrcAttribute(playerId: string) {
  const svgCode = multiavatar(playerId);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
}

export default function PlayerAvatar(props: DataTestIdAttributes & {
  playerId: string;
  highlight?: boolean;
  title?: string;
} & ({
  playerName: string;
} | {
  children: React.ReactNode;
} | {})) {
  const src = generateAvatarForSrcAttribute(props.playerId);
  if ('playerName' in props) {
    return <div className="player-avatar" title={props.title ?? props.playerName} data-testid={props['data-testid']}>
      <Avatar highlight={props.highlight} src={src}/>
      <div className="avatar-label">{props.playerName}</div>
    </div>;
  }
  if ('children' in props) {
    return <div className="player-avatar" title={props.title} data-testid={props['data-testid']}>
      <Avatar highlight={props.highlight} src={src}/>
      <div className="avatar-label">{props.children}</div>
    </div>;
  }
  return <Avatar
    title={props.title}
    highlight={props.highlight}
    src={src}
    data-testid={props['data-testid']}
  />;
}
