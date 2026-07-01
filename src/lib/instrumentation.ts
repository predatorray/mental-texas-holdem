import {trackEvent} from "./analytics";

/**
 * Minimal structural interfaces so this module can be wired to the real
 * TexasHoldemGameRoom / GameRoom instances in setup.ts and to lightweight
 * fakes in unit tests.
 */
interface TexasHoldemListenerLike {
  on(event: string, listener: (...args: any[]) => void): unknown;
  off(event: string, listener: (...args: any[]) => void): unknown;
}

interface GameRoomLike {
  listener: TexasHoldemListenerLike;
  peerId?: string;
}

interface TexasHoldemLike {
  listener: TexasHoldemListenerLike;
}

/** How long a pending turn may sit without any action before it is reported as a stall. */
export const STALL_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Wires Google Analytics events to the game rooms so GA can answer:
 * - how far do sessions get (connected → round started → round finished)?
 * - how many rounds does a session play, and how long does each take?
 * - do games silently stall mid-round (the "session ends early" symptom)?
 *
 * Replay-awareness: after a page refresh the Raft log re-fires every past
 * event. Raw table events are observed on the GameRoom (which carries the
 * replay flag) and replayed events are not re-counted. Round-end events are
 * only reported for rounds whose start was seen live in this page's lifetime.
 *
 * @returns a teardown function that removes all listeners and timers.
 */
export default function instrumentGame(texasHoldem: TexasHoldemLike, gameRoom: GameRoomLike): () => void {
  // rounds started live (not via replay) in this page's lifetime → start timestamp
  const liveRoundStartTimes = new Map<number, number>();

  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const clearStallTimer = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  const armStallTimer = (round: number, whoseTurn: string) => {
    clearStallTimer();
    stallTimer = setTimeout(() => {
      trackEvent('game_stalled', {
        round,
        waiting_for_self: whoseTurn === gameRoom.peerId,
        seconds_waiting: Math.round(STALL_TIMEOUT_MS / 1000),
      });
    }, STALL_TIMEOUT_MS);
  };

  const tableEventListener = (e: {data?: {type?: string, round?: number, players?: string[]}}, who: string, replay?: boolean) => {
    if (replay || !e.data) {
      return;
    }
    switch (e.data.type) {
      case 'newRound':
        if (typeof e.data.round === 'number') {
          liveRoundStartTimes.set(e.data.round, Date.now());
          trackEvent('round_start', {
            round: e.data.round,
            players_count: e.data.players?.length,
          });
        }
        break;
      case 'action/bet':
      case 'action/fold':
        // only count the local player's own actions, otherwise every client
        // would report every player's action and inflate the counts
        if (who === gameRoom.peerId) {
          trackEvent('player_action', {
            action_type: e.data.type === 'action/bet' ? 'bet' : 'fold',
            round: e.data.round,
          });
        }
        break;
    }
  };

  const statusListener = (status: string) => {
    trackEvent('game_room_status', {status});
  };

  const whoseTurnListener = (round: number, whose: string | null) => {
    if (whose) {
      armStallTimer(round, whose);
    } else {
      clearStallTimer();
    }
  };

  const winnerListener = (result: {round: number, how: string}) => {
    clearStallTimer();
    const startTime = liveRoundStartTimes.get(result.round);
    if (startTime === undefined) {
      return; // round was replayed (page refresh), already counted before
    }
    liveRoundStartTimes.delete(result.round);
    trackEvent('round_end', {
      round: result.round,
      how: result.how,
      duration_seconds: Math.round((Date.now() - startTime) / 1000),
    });
  };

  gameRoom.listener.on('event', tableEventListener);
  gameRoom.listener.on('status', statusListener);
  texasHoldem.listener.on('whoseTurn', whoseTurnListener);
  texasHoldem.listener.on('winner', winnerListener);

  return () => {
    clearStallTimer();
    gameRoom.listener.off('event', tableEventListener);
    gameRoom.listener.off('status', statusListener);
    texasHoldem.listener.off('whoseTurn', whoseTurnListener);
    texasHoldem.listener.off('winner', winnerListener);
  };
}
