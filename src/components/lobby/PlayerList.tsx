import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PlayerAvatar from "../PlayerAvatar";
import MyPlayerAvatar from "../MyPlayerAvatar";

export default function PlayerList(props: {
  playerId: string | undefined;
  hostPlayerId: string | undefined;
  members: string[];
  names: Map<string, string>;
  setMyName: (name: string) => void;
}) {
  const {
    playerId,
    hostPlayerId,
    members,
    names,
    setMyName,
  } = props;

  return (
    <Card data-testid="lobby-players">
      <CardContent>
        <Typography variant="h3" gutterBottom>
          Players ({members.length})
        </Typography>
        <Stack spacing={1}>
          {
            members.map((member, i) => (
              <Stack
                key={member}
                direction="row"
                spacing={1.5}
                sx={{alignItems: 'center', justifyContent: 'space-between'}}
                className="lobby-player-row"
                data-testid={`lobby-player-${i}`}
              >
                {
                  member === playerId
                    ? <MyPlayerAvatar playerId={playerId} names={names} setMyName={setMyName}/>
                    : <PlayerAvatar playerId={member} playerName={names.get(member) ?? member}/>
                }
                <Stack direction="row" spacing={0.5}>
                  {member === playerId && <Chip label="You" size="small" color="primary" variant="outlined"/>}
                  {member === hostPlayerId && <Chip label="Host" size="small" color="secondary" variant="outlined"/>}
                </Stack>
              </Stack>
            ))
          }
        </Stack>
        {
          members.length <= 1 && (
            <Typography variant="body2" sx={{mt: 2, opacity: 0.7}}>
              You're the only one here so far. Share the invite link to get others in.
            </Typography>
          )
        }
      </CardContent>
    </Card>
  );
}
