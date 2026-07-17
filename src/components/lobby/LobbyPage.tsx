import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {TexasHoldemRoundSettings} from "../../lib/texas-holdem/TexasHoldemGameRoom";
import {EventLogs} from "../../lib/texas-holdem/useEventLogs";
import {Messages} from "../../lib/useChatRoom";
import GithubProjectLink from "../GithubProjectLink";
import Invitation from "../Invitation";
import MessageBar from "../MessageBar";
import GameSettings from "./GameSettings";
import PlayerList from "./PlayerList";

/**
 * The dedicated pre-game lobby. Players land here before the first round
 * starts: they can see who has joined, chat, share the invite link, and the
 * host configures and starts the game.
 */
export default function LobbyPage(props: {
  playerId: string | undefined;
  /** True when this client created the room (there is no upstream host). */
  iAmHost: boolean;
  /** The host's player id, or undefined until known. */
  hostPlayerId: string | undefined;
  members: string[];
  names: Map<string, string>;
  setMyName: (name: string) => void;
  messages: Messages;
  sendMessage: (message: string) => void;
  eventLogs: EventLogs;
  startGame: (settings?: Partial<TexasHoldemRoundSettings>) => Promise<void>;
}) {
  const {
    playerId,
    iAmHost,
    hostPlayerId,
    members,
    names,
    setMyName,
    messages,
    sendMessage,
    eventLogs,
    startGame,
  } = props;

  return (
    <div className="App lobby-screen" data-testid="lobby">
      <GithubProjectLink/>
      <Container maxWidth="md" sx={{py: {xs: 2, sm: 4}}}>
        <Stack spacing={1} sx={{mb: {xs: 2, sm: 4}, alignItems: 'center'}}>
          <Typography variant="h1">Mental Texas Hold'em</Typography>
          <Typography variant="body2" sx={{opacity: 0.7}}>
            A serverless, peer-to-peer poker game — right in your browser.
          </Typography>
        </Stack>
        {
          !playerId ? (
            <Stack spacing={2} sx={{py: 8, alignItems: 'center'}} data-testid="lobby-connecting">
              <CircularProgress color="primary"/>
              <Typography variant="body2">Connecting...</Typography>
            </Stack>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'},
                gap: 2,
                alignItems: 'start',
              }}
            >
              <Stack spacing={2}>
                <Card>
                  <CardContent>
                    <Typography variant="h3" gutterBottom>Invite</Typography>
                    <Invitation hostPlayerId={hostPlayerId ?? playerId}/>
                  </CardContent>
                </Card>
                <PlayerList
                  playerId={playerId}
                  hostPlayerId={hostPlayerId}
                  members={members}
                  names={names}
                  setMyName={setMyName}
                />
                {
                  iAmHost ? (
                    <GameSettings members={members} startGame={(settings) => {
                      startGame(settings).catch(e => console.error(e));
                    }}/>
                  ) : (
                    <Card data-testid="staging">
                      <CardContent>
                        <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                          <CircularProgress size={20} color="primary"/>
                          <Typography variant="body1">
                            Waiting for the host to start the game...
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  )
                }
              </Stack>
              <MessageBar
                variant="inline"
                playerId={playerId}
                names={names}
                eventLogs={eventLogs}
                messages={messages}
                onMessage={sendMessage}
              />
            </Box>
          )
        }
      </Container>
    </div>
  );
}
