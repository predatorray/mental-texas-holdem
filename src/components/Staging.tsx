import {TexasHoldemRoundSettings} from "../lib/texas-holdem/TexasHoldemGameRoom";
import React, {useMemo} from "react";
import {HostId} from "../lib/setup";
import Invitation from "./Invitation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

/**
 * The between-rounds panel shown on the poker table once a round has
 * finished. The host can invite more players and start the next round;
 * guests wait for the host. (Pre-game setup lives in the lobby page.)
 */
export default function Staging(props: {
  round: number | undefined;
  playerId: string;
  members: string[];
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => void;
}) {
  const {
    members,
  } = props;

  const enoughMembersToPlay = useMemo(() => members.length > 1, [members]);

  if (HostId) {
    return (
      <div className="staging" data-testid="staging">
        <Stack direction="row" spacing={2} sx={{alignItems: 'center', justifyContent: 'center'}}>
          <CircularProgress size={18} color="primary"/>
          <Typography variant="body2">Waiting for the host to start the game...</Typography>
        </Stack>
      </div>
    );
  }

  return (
    <div className="staging host" data-testid="staging">
      <Invitation hostPlayerId={props.playerId}/>
      {
        enoughMembersToPlay
          ? <Button
            variant="contained"
            size="large"
            className="start-button"
            startIcon={<PlayArrowIcon/>}
            onClick={() => props.startGame()}
            data-testid="continue-button"
            sx={{mt: 2}}
          >continue</Button>
          : <Typography variant="body2" sx={{mt: 2}}>Needs 1 more player to start...</Typography>
      }
    </div>
  );
}
