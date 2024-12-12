import {useCallback, useEffect, useState} from "react";
import {TexasHoldem} from "../setup";
import {TexasHoldemGameRoomEvents, WinningResult} from "./TexasHoldemGameRoom";

export interface NewRoundEventLog {
  type: 'newRound'
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

  useEffect(() => {
    const winnerListener: TexasHoldemGameRoomEvents['winner'] = (result) => {
      appendLog({
        type: 'winner',
        result,
        timestamp: Date.now(),
      });
    };
    TexasHoldem.listener.on('winner', winnerListener);
    return () => {
      TexasHoldem.listener.off('winner', winnerListener);
    };
  }, [appendLog]);

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
    TexasHoldem.listener.on('fund', fundListener);
    return () => {
      TexasHoldem.listener.off('fund', fundListener);
    };
  }, [appendLog]);

  return logs;
}
