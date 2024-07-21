import { useCallback, useEffect, useMemo, useState } from "react";
import { BoardStage } from "./useBoard";

export default function useWhoseTurn(
  allInPlayers: Set<string>,
  foldedPlayers: Set<string>,
  calledPlayers: Set<string>,
  boardStage: BoardStage | null,
  players?: string[],
) {
  const [whoseTurnOffset, setWhoseTurnOffset] = useState<number>();

  // initialize whoseTurnOffset
  useEffect(() => {
    if (!players || !boardStage || whoseTurnOffset !== undefined) {
      return;
    }
    if (boardStage === 'Preflop') {
      // the one next to BB
      setWhoseTurnOffset(2 % players.length);
    } else {
      // SB or the first one who has not all-in or folded.
      for (let playerOffset = 0; playerOffset < players.length; ++playerOffset) {
        const player = players[playerOffset];
        if (allInPlayers && allInPlayers.has(player)) {
          continue;
        }
        if (foldedPlayers && foldedPlayers.has(player)) {
          continue;
        }
        setWhoseTurnOffset(playerOffset);
        break;
      }
    }
  }, [allInPlayers, foldedPlayers, boardStage, players, whoseTurnOffset]);

  useEffect(() => {
    if (boardStage === undefined || boardStage === 'Preflop') {
      return;
    }
    setWhoseTurnOffset(undefined);
  }, [boardStage]);

  const everyOneIsCalledAllInOrFolded = useMemo(() => {
    if (!players) {
      return true;
    }
    for (const player of players) {
      if (!calledPlayers.has(player) && !allInPlayers.has(player) && !foldedPlayers.has(player)) {
        return false;
      }
    }
    return true;
  }, [players, allInPlayers, foldedPlayers, calledPlayers]);

  const whoseTurn = useMemo(() => {
    if (!players || whoseTurnOffset === undefined) {
      return undefined;
    } else if (everyOneIsCalledAllInOrFolded) {
      return undefined;
    }
    return players[whoseTurnOffset];
  }, [everyOneIsCalledAllInOrFolded, players, whoseTurnOffset]);

  const nextPlayersTurn = useCallback(() => {
    if (!players) {
      return;
    }
    setWhoseTurnOffset(offset => {
      if (offset === undefined) {
        return undefined;
      }
      for (let i = 1; i < players.length; ++i) {
        const playerOffset = (offset + i) % players.length;
        const player = players[playerOffset];
        if (allInPlayers && allInPlayers.has(player)) {
          continue;
        }
        if (foldedPlayers && foldedPlayers.has(player)) {
          continue;
        }
        return playerOffset === offset ? undefined : playerOffset;
      }
      console.debug('everyone is either all-in or folded.');
      return undefined;
    });
  }, [allInPlayers, foldedPlayers, players]);

  return {
    whoseTurn,
    nextPlayersTurn,
  };
}
