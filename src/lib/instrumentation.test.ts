import EventEmitter from "eventemitter3";
import instrumentGame, {STALL_TIMEOUT_MS} from "./instrumentation";

describe('instrumentGame', () => {
  let gtagMock: jest.Mock;
  let gameRoomEmitter: EventEmitter;
  let texasHoldemEmitter: EventEmitter;
  let teardown: () => void;

  const gameRoom = () => ({
    listener: gameRoomEmitter,
    peerId: 'me',
  });

  beforeEach(() => {
    jest.useFakeTimers();
    gtagMock = jest.fn();
    (window as any).gtag = gtagMock;
    gameRoomEmitter = new EventEmitter();
    texasHoldemEmitter = new EventEmitter();
    teardown = instrumentGame({listener: texasHoldemEmitter}, gameRoom());
  });

  afterEach(() => {
    teardown();
    jest.useRealTimers();
    delete (window as any).gtag;
  });

  const eventsNamed = (name: string) =>
    gtagMock.mock.calls.filter(([, eventName]) => eventName === name);

  test('reports round_start for live newRound events', () => {
    gameRoomEmitter.emit('event', {
      data: {type: 'newRound', round: 1, players: ['me', 'other']},
    }, 'me', false);

    expect(eventsNamed('round_start')).toEqual([
      ['event', 'round_start', {round: 1, players_count: 2}],
    ]);
  });

  test('does not report replayed events', () => {
    gameRoomEmitter.emit('event', {
      data: {type: 'newRound', round: 1, players: ['me', 'other']},
    }, 'me', true);
    gameRoomEmitter.emit('event', {
      data: {type: 'action/bet', round: 1, amount: 2},
    }, 'me', true);

    expect(gtagMock).not.toHaveBeenCalled();
  });

  test('reports only own player actions', () => {
    gameRoomEmitter.emit('event', {
      data: {type: 'action/bet', round: 1, amount: 2},
    }, 'me', false);
    gameRoomEmitter.emit('event', {
      data: {type: 'action/fold', round: 1},
    }, 'other', false);

    expect(eventsNamed('player_action')).toEqual([
      ['event', 'player_action', {action_type: 'bet', round: 1}],
    ]);
  });

  test('reports round_end with duration for live rounds only', () => {
    gameRoomEmitter.emit('event', {
      data: {type: 'newRound', round: 1, players: ['me', 'other']},
    }, 'me', false);

    texasHoldemEmitter.emit('winner', {round: 1, how: 'Showdown'});

    const roundEndEvents = eventsNamed('round_end');
    expect(roundEndEvents.length).toBe(1);
    expect(roundEndEvents[0][2]).toMatchObject({round: 1, how: 'Showdown'});
    expect(typeof roundEndEvents[0][2].duration_seconds).toBe('number');

    // a winner for a round that was never started live (e.g., replayed) is ignored
    texasHoldemEmitter.emit('winner', {round: 0, how: 'LastOneWins'});
    expect(eventsNamed('round_end').length).toBe(1);
  });

  test('reports game_stalled when a turn is pending for too long', () => {
    texasHoldemEmitter.emit('whoseTurn', 1, 'me', {callAmount: 2});

    jest.advanceTimersByTime(STALL_TIMEOUT_MS + 1);

    expect(eventsNamed('game_stalled')).toEqual([
      ['event', 'game_stalled', {
        round: 1,
        waiting_for_self: true,
        seconds_waiting: STALL_TIMEOUT_MS / 1000,
      }],
    ]);
  });

  test('does not report game_stalled if the turn advances in time', () => {
    texasHoldemEmitter.emit('whoseTurn', 1, 'other', {callAmount: 2});
    jest.advanceTimersByTime(STALL_TIMEOUT_MS / 2);

    // turn advances: timer must reset
    texasHoldemEmitter.emit('whoseTurn', 1, 'me', {callAmount: 0});
    jest.advanceTimersByTime(STALL_TIMEOUT_MS / 2 + 1);
    expect(eventsNamed('game_stalled').length).toBe(0);

    // round finishes: timer must be cleared
    texasHoldemEmitter.emit('winner', {round: 1, how: 'LastOneWins'});
    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 2);
    expect(eventsNamed('game_stalled').length).toBe(0);
  });

  test('clears the stall timer when whoseTurn becomes null', () => {
    texasHoldemEmitter.emit('whoseTurn', 1, 'me', {callAmount: 2});
    texasHoldemEmitter.emit('whoseTurn', 1, null);

    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 2);
    expect(eventsNamed('game_stalled').length).toBe(0);
  });

  test('reports game room status changes', () => {
    gameRoomEmitter.emit('status', 'PeerServerConnected');
    expect(eventsNamed('game_room_status')).toEqual([
      ['event', 'game_room_status', {status: 'PeerServerConnected'}],
    ]);
  });

  test('teardown removes listeners and timers', () => {
    teardown();
    gameRoomEmitter.emit('event', {
      data: {type: 'newRound', round: 1, players: ['me', 'other']},
    }, 'me', false);
    texasHoldemEmitter.emit('whoseTurn', 1, 'me', {callAmount: 2});
    jest.advanceTimersByTime(STALL_TIMEOUT_MS * 2);

    expect(gtagMock).not.toHaveBeenCalled();

    // reinstall so afterEach teardown() is harmless
    teardown = instrumentGame({listener: texasHoldemEmitter}, gameRoom());
  });
});
