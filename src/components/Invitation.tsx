import DataTestIdAttributes from "../lib/types";
import {HostId} from "../lib/setup";
import React, {useCallback, useRef, useState} from "react";
import {useTimeout} from "../lib/utils";

export default function Invitation(props: DataTestIdAttributes & {
  hostPlayerId: string;
}) {
  const roomLink = HostId
    ? window.location.href
    : `${window.location.href}?gameRoomId=${props.hostPlayerId}`;

  const [copied, setCopied] = useState(false);
  useTimeout(useCallback(() => {
    if (copied) {
      setCopied(false);
    }
  }, [copied]), 3000);

  const roomLinkInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="invitation input-group" data-testid={props['data-testid'] ?? 'invitation'}>
      <label>Invite others by sharing this link: </label>
      <input
        ref={roomLinkInputRef}
        type="text"
        readOnly={true}
        value={roomLink}
        data-testid="room-link"
        onFocus={(e) => e.target.setSelectionRange(0, e.target.value.length)}
      />
      <button className="copy-link-button" data-testid="copy-link-button" onClick={() => {
        roomLinkInputRef.current?.focus();
        navigator.clipboard.writeText(roomLink).then(() => setCopied(true));
      }}>{copied ? <b>Copied!</b> : 'Copy'}</button>
    </div>
  );
}