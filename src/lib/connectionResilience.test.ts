import EventEmitter from "eventemitter3";
import enableConnectionResilience, {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_INTERVAL_MS,
} from "./connectionResilience";

class FakeMesh {
  peerId: string | undefined = 'me';
  peers: string[] = ['me'];
  private emitter = new EventEmitter();

  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    this.emitter.off(event, listener);
  }

  setPeers(peers: string[]) {
    this.peers = peers;
    this.emitter.emit('peersChanged', peers);
  }
}

describe('enableConnectionResilience', () => {
  let gtagMock: jest.Mock;
  let mesh: FakeMesh;
  let connectMock: jest.Mock;
  let teardown: () => void;

  beforeEach(() => {
    jest.useFakeTimers();
    gtagMock = jest.fn();
    (window as any).gtag = gtagMock;
    mesh = new FakeMesh();
    connectMock = jest.fn();
    teardown = enableConnectionResilience(mesh, {connect: connectMock});
  });

  afterEach(() => {
    teardown();
    jest.useRealTimers();
    delete (window as any).gtag;
  });

  const eventsNamed = (name: string) =>
    gtagMock.mock.calls.filter(([, eventName]) => eventName === name);

  test('reports peer_connected when a new peer joins', () => {
    mesh.setPeers(['me', 'other']);
    expect(eventsNamed('peer_connected')).toEqual([
      ['event', 'peer_connected', {peers_count: 1}],
    ]);

    // same membership again should not re-report
    mesh.setPeers(['me', 'other']);
    expect(eventsNamed('peer_connected').length).toBe(1);
  });

  test('re-dials a lost peer until it comes back', () => {
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']); // 'other' dropped

    expect(eventsNamed('peer_lost').length).toBe(1);

    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS * 3);
    expect(connectMock).toHaveBeenCalledTimes(3);
    expect(connectMock).toHaveBeenCalledWith('other');

    // peer comes back
    mesh.setPeers(['me', 'other']);
    expect(eventsNamed('peer_reconnected').length).toBe(1);

    // retrying must stop
    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS * 5);
    expect(connectMock).toHaveBeenCalledTimes(3);
  });

  test('gives up after MAX_RECONNECT_ATTEMPTS and reports failure', () => {
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']);

    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS * (MAX_RECONNECT_ATTEMPTS + 2));

    expect(connectMock).toHaveBeenCalledTimes(MAX_RECONNECT_ATTEMPTS);
    expect(eventsNamed('peer_reconnect_failed').length).toBe(1);

    // if the peer later reappears, it is treated as a fresh connection
    mesh.setPeers(['me', 'other']);
    expect(eventsNamed('peer_connected').length).toBe(2);
  });

  test('a reconnected peer that drops again is retried again', () => {
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']);
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']);

    expect(eventsNamed('peer_lost').length).toBe(2);
    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS);
    expect(connectMock).toHaveBeenCalled();
  });

  test('connect errors do not stop the retry loop', () => {
    connectMock.mockImplementation(() => {
      throw new Error('boom');
    });
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']);

    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS * 2);
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  test('teardown stops all retry timers', () => {
    mesh.setPeers(['me', 'other']);
    mesh.setPeers(['me']);

    teardown();
    jest.advanceTimersByTime(RECONNECT_INTERVAL_MS * 5);
    expect(connectMock).not.toHaveBeenCalled();

    // reinstall so afterEach teardown() is harmless
    teardown = enableConnectionResilience(mesh, {connect: connectMock});
  });
});
