import {trackEvent} from "./analytics";

/**
 * Minimal view of DandelionMesh used by this module (also easy to fake in tests).
 */
export interface MeshView {
  readonly peerId: string | undefined;
  readonly peers: string[];
  on(event: 'peersChanged', listener: (peers: string[]) => void): void;
  off(event: 'peersChanged', listener: (peers: string[]) => void): void;
}

/**
 * Minimal view of the transport used to re-dial peers.
 * PeerJSTransport.connect() is idempotent while a connection is open/pending.
 */
export interface TransportView {
  connect(remotePeerId: string): void;
}

export const RECONNECT_INTERVAL_MS = 5_000;
export const MAX_RECONNECT_ATTEMPTS = 24; // 24 × 5s = 2 minutes per lost peer

interface RetryState {
  attempts: number;
  since: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Watches mesh membership and automatically re-dials peers whose WebRTC data
 * connection dropped (e.g., an unstable TURN relay). dandelion-mesh only dials
 * bootstrap peers once at startup and never reconnects, so without this any
 * transient connection loss permanently splits the game.
 *
 * Also reports connection telemetry to GA:
 * - `peer_connected`   — a peer joined (or re-joined) the mesh
 * - `peer_lost`        — a previously connected peer dropped
 * - `peer_reconnected` — a lost peer was recovered by re-dialing
 * - `peer_reconnect_failed` — gave up re-dialing after MAX_RECONNECT_ATTEMPTS
 *
 * @returns a teardown function that removes the listener and all retry timers.
 */
export default function enableConnectionResilience(mesh: MeshView, transport: TransportView): () => void {
  const knownPeers = new Set<string>();
  const retries = new Map<string, RetryState>();

  const stopRetrying = (peerId: string) => {
    const state = retries.get(peerId);
    if (state) {
      clearInterval(state.timer);
      retries.delete(peerId);
    }
    return state;
  };

  const startRetrying = (peerId: string) => {
    const since = Date.now();
    const state: RetryState = {
      attempts: 0,
      since,
      timer: setInterval(() => {
        state.attempts++;
        if (state.attempts > MAX_RECONNECT_ATTEMPTS) {
          stopRetrying(peerId);
          knownPeers.delete(peerId);
          trackEvent('peer_reconnect_failed', {
            duration_seconds: Math.round((Date.now() - since) / 1000),
          });
          return;
        }
        try {
          transport.connect(peerId);
        } catch (e) {
          console.debug(`Reconnect attempt to ${peerId} failed.`, e);
        }
      }, RECONNECT_INTERVAL_MS),
    };
    retries.set(peerId, state);
  };

  const peersChangedListener = (peers: string[]) => {
    const others = new Set(peers.filter(p => p !== mesh.peerId));

    for (const peerId of Array.from(others)) {
      const retryState = stopRetrying(peerId);
      if (retryState) {
        trackEvent('peer_reconnected', {
          duration_seconds: Math.round((Date.now() - retryState.since) / 1000),
        });
      } else if (!knownPeers.has(peerId)) {
        trackEvent('peer_connected', {peers_count: others.size});
      }
      knownPeers.add(peerId);
    }

    for (const peerId of Array.from(knownPeers)) {
      if (!others.has(peerId) && !retries.has(peerId)) {
        trackEvent('peer_lost', {peers_count: others.size});
        startRetrying(peerId);
      }
    }
  };

  mesh.on('peersChanged', peersChangedListener);

  return () => {
    mesh.off('peersChanged', peersChangedListener);
    for (const peerId of Array.from(retries.keys())) {
      stopRetrying(peerId);
    }
  };
}
