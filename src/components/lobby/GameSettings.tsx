import React, {useMemo, useState} from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {TexasHoldemRoundSettings} from "../../lib/texas-holdem/TexasHoldemGameRoom";

/**
 * The host-only game settings card shown on the lobby page. Guests instead
 * see the waiting card rendered by LobbyPage.
 */
export default function GameSettings(props: {
  members: string[];
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => void;
}) {
  const {
    members,
    startGame,
  } = props;

  const enoughMembersToPlay = useMemo(() => members.length > 1, [members]);

  const [initialFundAmountInput, setInitialFundAmountInput] = useState('100');
  const initialFundAmount = useMemo(() => parseInt(initialFundAmountInput), [initialFundAmountInput]);
  const [bits, setBits] = useState(32);

  return (
    <Card data-testid="staging">
      <CardContent>
        <Typography variant="h3" gutterBottom>Game Settings</Typography>
        <Stack spacing={2} sx={{mt: 2}}>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Small Blind ($)"
              size="small"
              fullWidth
              value="1"
              disabled
              slotProps={{htmlInput: {'data-testid': 'sb-input', readOnly: true}}}
            />
            <TextField
              label="Big Blind ($)"
              size="small"
              fullWidth
              value="2"
              disabled
              slotProps={{htmlInput: {'data-testid': 'bb-input', readOnly: true}}}
            />
          </Stack>
          <TextField
            label="Initial Amount ($)"
            size="small"
            type="number"
            fullWidth
            value={initialFundAmountInput}
            onChange={(e) => setInitialFundAmountInput(e.target.value)}
            slotProps={{htmlInput: {'data-testid': 'initial-fund-amount-input'}}}
          />
          <TextField
            label="Encryption Key Length (bits)"
            size="small"
            select
            fullWidth
            value={bits}
            onChange={(e) => setBits(Number(e.target.value))}
            slotProps={{
              select: {
                native: true,
                inputProps: {'data-testid': 'encryption-key-length-option'},
              },
            }}
            helperText="Longer keys are more secure but slower to shuffle."
          >
            <option value={32}>32</option>
            <option value={64}>64</option>
            <option value={128}>128</option>
          </TextField>
          {
            enoughMembersToPlay
              ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon/>}
                  onClick={() => startGame({bits, initialFundAmount})}
                  data-testid="start-button"
                >
                  start
                </Button>
              ) : (
                <Alert severity="info" variant="outlined">
                  Needs 1 more player to start...
                </Alert>
              )
          }
        </Stack>
      </CardContent>
    </Card>
  );
}
