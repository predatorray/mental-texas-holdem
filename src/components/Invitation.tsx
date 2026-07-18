import DataTestIdAttributes from "../lib/types";
import {HostId} from "../lib/setup";
import React, {useCallback, useState} from "react";
import {useTimeout} from "../lib/utils";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

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

  return (
    <div className="invitation" data-testid={props['data-testid'] ?? 'invitation'}>
      <Typography variant="body2" component="label" sx={{display: 'block', mb: 1, opacity: 0.8}}>
        Invite others by sharing this link:
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          value={roomLink}
          slotProps={{
            htmlInput: {
              'data-testid': 'room-link',
              readOnly: true,
              onFocus: (e: React.FocusEvent<HTMLInputElement>) =>
                e.target.setSelectionRange(0, e.target.value.length),
            },
          }}
        />
        <Button
          variant={copied ? "contained" : "outlined"}
          color={copied ? "success" : "primary"}
          className="copy-link-button"
          data-testid="copy-link-button"
          startIcon={copied ? <CheckIcon/> : <ContentCopyIcon/>}
          sx={{flexShrink: 0}}
          onClick={() => {
            navigator.clipboard.writeText(roomLink).then(() => setCopied(true));
          }}
        >
          {copied ? <b>Copied!</b> : 'Copy'}
        </Button>
      </Stack>
    </div>
  );
}
