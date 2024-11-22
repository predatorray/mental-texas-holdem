import {Board, Hole} from "../rules";
import {useCallback, useEffect, useState} from "react";
import {TexasHoldem} from "../setup";
import {TexasHoldemGameRoomEvents} from "./TexasHoldemGameRoom";

export interface NewRoundEventLog {
  type: 'newRound'
  round: number;
  players: string[];
  timestamp: number;
}

export interface HoleEventLog {
  type: 'hole';
  playerId: string;
  hole: Hole;
  timestamp: number;
}

export interface BoardEventLog {
  type: 'board'
  board: Board;
  timestamp: number;
}

export type EventLog =
  | NewRoundEventLog
  | HoleEventLog
  | BoardEventLog;

export type EventLogs = EventLog[];

export default function useEventLogs(): EventLogs {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const appendLog = useCallback((log: EventLog) => {
    setLogs(prev => [...prev, log]);
  }, []);

  useEffect(() => {
    const playersListeners: TexasHoldemGameRoomEvents['players'] = (round, players) => {
      appendLog({
        type: 'newRound',
        round,
        players,
        timestamp: Date.now(),
      });
    };
    TexasHoldem.listener.on('players', playersListeners);
    return () => {
      TexasHoldem.listener.off('players', playersListeners);
    };
  }, [appendLog]);

  useEffect(() => {
    const holeListener: TexasHoldemGameRoomEvents['hole'] = (round, whose, hole) => {
      appendLog({
        type: 'hole',
        playerId: whose,
        hole,
        timestamp: Date.now(),
      });
    };
    TexasHoldem.listener.on('hole', holeListener);
    return () => {
      TexasHoldem.listener.off('hole', holeListener);
    };
  }, [appendLog]);

  useEffect(() => {
    const boardListener: TexasHoldemGameRoomEvents['board'] = (round, board) => {
      appendLog({
        type: 'board',
        board,
        timestamp: Date.now(),
      });
    };
    TexasHoldem.listener.on('board', boardListener);
    return () => {
      TexasHoldem.listener.off('board', boardListener);
    };
  }, [appendLog]);

  return logs;
}
