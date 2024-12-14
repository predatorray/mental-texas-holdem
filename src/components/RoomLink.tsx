import {HostId} from "../lib/setup";
import React from "react";
import DataTestIdAttributes from "../lib/types";

export default function RoomLink(props: {
  hostPlayerId: string;
} & DataTestIdAttributes) {
  const roomLink = HostId
    ? window.location.href
    : `${window.location.href}?gameRoomId=${props.hostPlayerId}`;
  return (
    <a
      href={roomLink}
      target="_blank"
      rel="noreferrer"
      data-testid={props['data-testid'] ?? 'room-link'}
    >
      <b>Invitation Link</b>
    </a>
  );
}
