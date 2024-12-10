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

export interface CheckEventLog {
  type: 'check';
  playerId: string;
  timestamp: number;
}

export interface RaiseEventLog {
  type: 'raise';
  playerId: string;
  raisedAmount: number;
  allin: boolean;
  timestamp: number;
}

export interface FoldEventLog {
  type: 'fold';
  playerId: string;
  timestamp: number;
}

export type EventLog =
  | NewRoundEventLog
  | HoleEventLog
  | BoardEventLog
  | CheckEventLog
  | RaiseEventLog
  | FoldEventLog
;

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

  useEffect(() => {
    const betListener: TexasHoldemGameRoomEvents['bet'] = (round, amount, who, allin) => {
      if (amount === 0) {
        appendLog({
          type: 'check',
          playerId: who,
          timestamp: Date.now(),
        });
      } else {
        appendLog({
          type: 'raise',
          raisedAmount: amount,
          playerId: who,
          allin,
          timestamp: Date.now(),
        });
      }
    };
    TexasHoldem.listener.on('bet', betListener);
    return () => {
      TexasHoldem.listener.off('bet', betListener);
    };
  }, [appendLog]);

  useEffect(() => {
    const foldListener: TexasHoldemGameRoomEvents['fold'] = (round, who) => {
      appendLog({
        type: 'fold',
        playerId: who,
        timestamp: Date.now(),
      });
    };
    TexasHoldem.listener.on('fold', foldListener);
    return () => {
      TexasHoldem.listener.off('fold', foldListener);
    };
  }, [appendLog]);

  return logs;
}
