import useEventLogs, {EventLog} from "./useEventLogs";
import {renderHook, waitFor} from "@testing-library/react";
import EventEmitter from "eventemitter3";
import {TexasHoldemGameRoomEvents} from "./TexasHoldemGameRoom";

describe('useEventLogs', () => {
  const testEventLog = <T extends EventLog['type'], E extends EventLog = EventLog & { type: T }>(
    name: string,
    emitEventFn: (listener: EventEmitter<TexasHoldemGameRoomEvents>) => void,
    expectedEventType: T,
    assertEventFn: (event: E) => void,
  ) => {
    test(name, async () => {
      const listener = new EventEmitter<TexasHoldemGameRoomEvents>();
      const { result } = renderHook(() => useEventLogs(listener));

      emitEventFn(listener);

      await waitFor(() => {
        expect(result.current.length).toBe(1);
      });

      const event = result.current[0];
      expect(event.type).toBe(expectedEventType);
      assertEventFn(event as E);
    })
  };

  testEventLog('newRound', (listener) => {
    listener.emit('players', 1, ['p1', 'p2']);
  }, 'newRound', (event) => {
    expect(event.players).toEqual(['p1', 'p2']);
    expect(event.round).toBe(1);
  });

  testEventLog('bet (check)', (listener) => {
    listener.emit('bet', 1, 0, 'p1', false);
  }, 'check', (event) => {
    expect(event.playerId).toBe('p1');
  });

  testEventLog('bet (raise)', (listener) => {
    listener.emit('bet', 1, 1, 'p1', false);
  }, 'raise', (event) => {
    expect(event.raisedAmount).toBe(1);
    expect(event.playerId).toBe('p1');
    expect(event.allin).toBeFalsy();
  });

  testEventLog('bet all-in (raise)', (listener) => {
    listener.emit('bet', 1, 2, 'p1', true);
  }, 'raise', (event) => {
    expect(event.raisedAmount).toBe(2);
    expect(event.playerId).toBe('p1');
    expect(event.allin).toBeTruthy();
  });

  testEventLog('fold', (listener) => {
    listener.emit('fold', 1, 'p1');
  }, 'fold', (event) => {
    expect(event.playerId).toBe('p1');
  });

  testEventLog('winner', (listener) => {
    listener.emit('winner', { how: 'LastOneWins', winner: 'p1', round: 1 });
  }, 'winner', (event) => {
    expect(event.result).toEqual({ how: 'LastOneWins', winner: 'p1', round: 1 });
  });

  testEventLog('fund', (listener) => {
    listener.emit('fund', 1, 2, 'p1', false);
  }, 'fund', (event) => {
    expect(event.playerId).toBe('p1');
    expect(event.currentAmount).toBe(1);
    expect(event.previousAmount).toBe(2);
    expect(event.borrowed).toBeFalsy();
  });

  testEventLog('fund (borrowed)', (listener) => {
    listener.emit('fund', 1, 2, 'p1', true);
  }, 'fund', (event) => {
    expect(event.playerId).toBe('p1');
    expect(event.currentAmount).toBe(1);
    expect(event.previousAmount).toBe(2);
    expect(event.borrowed).toBeTruthy();
  });

  testEventLog('fund (initial)', (listener) => {
    listener.emit('fund', 100, undefined, 'p1', true);
  }, 'fund', (event) => {
    expect(event.playerId).toBe('p1');
    expect(event.currentAmount).toBe(100);
    expect(event.previousAmount).toBeUndefined();
    expect(event.borrowed).toBeTruthy();
  });
});
