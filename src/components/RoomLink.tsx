import {HostId} from "../lib/setup";
import React from "react";

export default function RoomLink(props: {
  hostPlayerId: string;
}) {
  const roomLink = HostId
    ? window.location.href
    : `${window.location.href}?gameRoomId=${props.hostPlayerId}`;
  return (
    <a
      href={roomLink}
      target="_blank"
      rel="noreferrer"><b>Invitation Link</b>
    </a>
  );
}
