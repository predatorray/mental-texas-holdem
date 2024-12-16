import {useCallback, useEffect, useState} from "react";
import {TexasHoldem} from "../setup";
import {TexasHoldemGameRoomEvents, WinningResult} from "./TexasHoldemGameRoom";
import {EventListener} from "../types";

export interface NewRoundEventLog {
  type: 'newRound';
  round: number;
  players: string[];
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

export interface WinnerEventLog {
  type: 'winner';
  result: WinningResult;
  timestamp: number;
}

export interface FundEventLog {
  type: 'fund';
  playerId: string;
  previousAmount?: number;
  currentAmount: number;
  borrowed?: boolean;
  timestamp: number;
}

export type EventLog =
  | NewRoundEventLog
  | CheckEventLog
  | RaiseEventLog
  | FoldEventLog
  | WinnerEventLog
  | FundEventLog
;

export type EventLogs = EventLog[];

export default function useEventLogs(
  listener: EventListener<TexasHoldemGameRoomEvents> = TexasHoldem.listener,
): EventLogs {
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
    listener.on('players', playersListeners);
    return () => {
      listener.off('players', playersListeners);
    };
  }, [listener, appendLog]);

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
    listener.on('bet', betListener);
    return () => {
      listener.off('bet', betListener);
    };
  }, [listener, appendLog]);

  useEffect(() => {
    const foldListener: TexasHoldemGameRoomEvents['fold'] = (round, who) => {
      appendLog({
        type: 'fold',
        playerId: who,
        timestamp: Date.now(),
      });
    };
    listener.on('fold', foldListener);
    return () => {
      listener.off('fold', foldListener);
    };
  }, [listener, appendLog]);

  useEffect(() => {
    const winnerListener: TexasHoldemGameRoomEvents['winner'] = (result) => {
      appendLog({
        type: 'winner',
        result,
        timestamp: Date.now(),
      });
    };
    listener.on('winner', winnerListener);
    return () => {
      listener.off('winner', winnerListener);
    };
  }, [listener, appendLog]);

  useEffect(() => {
    const fundListener: TexasHoldemGameRoomEvents['fund'] = (currentAmount, previousAmount, playerId, borrowed) => {
      appendLog({
        type: 'fund',
        playerId,
        currentAmount,
        previousAmount,
        borrowed,
        timestamp: Date.now(),
      });
    };
    listener.on('fund', fundListener);
    return () => {
      listener.off('fund', fundListener);
    };
  }, [listener, appendLog]);

  return logs;
}
