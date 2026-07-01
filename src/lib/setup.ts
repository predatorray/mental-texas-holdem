import MentalPokerGameRoom, {MentalPokerEvent} from "./MentalPokerGameRoom";
import GameRoom from "./GameRoom";
import {TexasHoldemGameRoom, TexasHoldemTableEvent} from "./texas-holdem/TexasHoldemGameRoom";
import ChatRoom, {ChatRoomEvent} from "./ChatRoom";
import Peer from "peerjs";
import {
  CryptoKeyBundle,
  DandelionMesh,
  generateKeyBundle,
  PeerJSTransport,
  SessionStorageRaftLog,
} from "dandelion-mesh";
import {trackError, trackEvent} from "./analytics";
import instrumentGame from "./instrumentation";
import enableConnectionResilience from "./connectionResilience";

type AllEvents = MentalPokerEvent | ChatRoomEvent | TexasHoldemTableEvent;

const MODULUS_LENGTH = 2048;
const SESSION_KEY_BUNDLE = 'mental-holdem:keyBundle';
const SESSION_PEER_ID = 'mental-holdem:peerId';
const SESSION_BOOTSTRAP_PEERS = 'mental-holdem:bootstrapPeers';

const INITIAL_CONNECT_TIMEOUT_MS = 30_000;
const SIGNALING_RECONNECT_DELAY_MS = 3_000;
const MAX_SIGNALING_RECONNECT_ATTEMPTS = 10;

/**
 * Derive a short, deterministic peer ID from an RSA public key JWK.
 * Uses SHA-256 of the canonical JSON, then encodes the first 8 bytes as
 * base36 — similar in spirit to a Bitcoin address checksum.
 */
async function derivePeerId(publicKeyJwk: JsonWebKey): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(publicKeyJwk));
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(hash).slice(0, 8);
  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = (num << BigInt(8)) | BigInt(bytes[i]);
  }
  return num.toString(36);
}

/**
 * Load or generate a CryptoKeyBundle for this session.
 * On first load, generates a new RSA key pair, stores the JWK representations
 * in sessionStorage, and derives a stable peerId. On refresh, reloads the
 * stored keys so the peer identity is preserved.
 */
async function getOrCreateSessionKeyBundle(): Promise<{
  bundle: CryptoKeyBundle;
  peerId: string;
}> {
  const storedPeerId = sessionStorage.getItem(SESSION_PEER_ID);
  const storedBundle = sessionStorage.getItem(SESSION_KEY_BUNDLE);

  if (storedPeerId && storedBundle) {
    const { publicKeyJwk, privateKeyJwk } = JSON.parse(storedBundle);
    const publicKey = await crypto.subtle.importKey(
      'jwk', publicKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt'],
    );
    const privateKey = await crypto.subtle.importKey(
      'jwk', privateKeyJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt'],
    );
    return {
      bundle: { publicKey, privateKey, publicKeyJwk },
      peerId: storedPeerId,
    };
  }

  // First load — generate new keys
  const bundle = await generateKeyBundle(MODULUS_LENGTH);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', bundle.privateKey);
  const peerId = await derivePeerId(bundle.publicKeyJwk);

  sessionStorage.setItem(SESSION_KEY_BUNDLE, JSON.stringify({
    publicKeyJwk: bundle.publicKeyJwk,
    privateKeyJwk,
  }));
  sessionStorage.setItem(SESSION_PEER_ID, peerId);

  return { bundle, peerId };
}

/**
 * Fetch TURN/STUN ICE servers from metered.ca.
 *
 * The API key is read from `REACT_APP_METERED_API_KEY`, which Create React App
 * inlines into the bundle at build time. The GitHub publish workflow injects the
 * key from a repository secret. When the variable is absent (local dev, unit
 * tests, e2e tests) we return `undefined` so PeerJS falls back to its built-in
 * ICE servers. Note that, because there is no backend, the key is necessarily
 * plaintext in the shipped bundle.
 *
 * The outcome is reported to GA as `ice_config_loaded`: sessions with
 * `turn_enabled: false` only have STUN available, so peers behind symmetric
 * NATs will not be able to establish a WebRTC connection at all.
 */
async function fetchMeteredIceServers(): Promise<RTCIceServer[] | undefined> {
  const apiKey = process.env.REACT_APP_METERED_API_KEY;
  if (!apiKey) {
    trackEvent('ice_config_loaded', { turn_enabled: false, reason: 'no_api_key' });
    return undefined;
  }
  const startedAt = Date.now();
  try {
    const response = await fetch(
      `https://predatorray.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
    );
    if (!response.ok) {
      throw new Error(`metered.ca responded with ${response.status}`);
    }
    const iceServers = await response.json();
    trackEvent('ice_config_loaded', { turn_enabled: true, duration_ms: Date.now() - startedAt });
    return iceServers;
  } catch (err) {
    console.error('Failed to fetch ICE servers from metered.ca; falling back to PeerJS defaults.', err);
    trackError('ice_config', err);
    trackEvent('ice_config_loaded', { turn_enabled: false, reason: 'fetch_failed' });
    return undefined;
  }
}

/**
 * Report uncaught errors and unhandled promise rejections to GA, so crashes
 * that silently kill a session become visible in the dashboards.
 */
function installGlobalErrorTracking() {
  window.addEventListener('error', (e) => {
    trackEvent('js_error', { message: String(e.message).slice(0, 100) });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    trackEvent('js_error', { message: message.slice(0, 100), unhandled_rejection: true });
  });
}

/**
 * PeerJS does not reconnect to its signaling server on its own. While the
 * signaling connection is down no new WebRTC connection can be negotiated:
 * nobody can join the room and lost peers cannot be re-dialed. Reconnect
 * with a small delay and report both the loss and the recovery to GA.
 */
function installSignalingReconnect(peer: Peer) {
  let attempts = 0;
  peer.on('disconnected', () => {
    trackEvent('signaling_lost', { reconnect_attempts_before: attempts });
    if (attempts >= MAX_SIGNALING_RECONNECT_ATTEMPTS) {
      return;
    }
    attempts++;
    setTimeout(() => {
      if (!peer.destroyed && peer.disconnected) {
        try {
          peer.reconnect();
        } catch (e) {
          trackError('signaling_reconnect', e);
        }
      }
    }, SIGNALING_RECONNECT_DELAY_MS);
  });
  peer.on('open', () => {
    if (attempts > 0) {
      trackEvent('signaling_restored', { attempts });
      attempts = 0;
    }
  });
}

/**
 * A minimal Peer facade handed to PeerJSTransport that swallows repeated
 * 'open' events.
 *
 * DandelionMesh re-initializes its internal Raft node every time the transport
 * emits 'open'. After a signaling reconnect (see installSignalingReconnect)
 * PeerJS emits 'open' again, which would leave a second, orphaned Raft node
 * running — its election timers would keep escalating terms and destabilize
 * the whole cluster. The mesh must therefore only ever observe the first
 * 'open'; our own listeners are attached to the real Peer instance instead.
 */
function meshFacingPeer(peer: Peer): Peer {
  let opened = false;
  const facade = {
    on(event: string, listener: (...args: unknown[]) => void) {
      if (event === 'open') {
        peer.on('open', (id: string) => {
          if (!opened) {
            opened = true;
            listener(id);
          }
        });
        return;
      }
      peer.on(event as any, listener as any);
    },
    connect: peer.connect.bind(peer),
    destroy: peer.destroy.bind(peer),
  };
  return facade as unknown as Peer;
}

/**
 * Report whether this client managed to reach any of its bootstrap peers
 * (i.e., the game room it was invited to, or the peers known before a
 * refresh) within a timeout. This is the primary success/failure signal
 * for WebRTC (TURN) connection establishment in GA.
 */
function watchInitialConnection(mesh: DandelionMesh<AllEvents>, bootstrapPeers: string[], role: string) {
  const startedAt = Date.now();
  const cleanup = () => {
    clearTimeout(timer);
    mesh.off('peersChanged', listener);
  };
  const listener = (peers: string[]) => {
    if (bootstrapPeers.some(bp => peers.includes(bp))) {
      cleanup();
      trackEvent('bootstrap_connect_result', {
        success: true,
        role,
        duration_ms: Date.now() - startedAt,
      });
    }
  };
  const timer = setTimeout(() => {
    cleanup();
    trackEvent('bootstrap_connect_result', {
      success: false,
      role,
      timeout_ms: INITIAL_CONNECT_TIMEOUT_MS,
    });
  }, INITIAL_CONNECT_TIMEOUT_MS);
  mesh.on('peersChanged', listener);
}

async function initSetup() {
  const setupStartedAt = Date.now();
  installGlobalErrorTracking();

  const { bundle, peerId } = await getOrCreateSessionKeyBundle();

  const iceServers = await fetchMeteredIceServers();

  const bootstrapPeerFromUrl = new URLSearchParams(window.location.search).get('gameRoomId') ?? undefined;
  const storedBootstrapPeers: string[] = JSON.parse(sessionStorage.getItem(SESSION_BOOTSTRAP_PEERS) || '[]');

  // Use URL param if available, otherwise fall back to stored peers (for refresh survival)
  const bootstrapPeers = bootstrapPeerFromUrl
    ? [bootstrapPeerFromUrl]
    : storedBootstrapPeers;

  const role = bootstrapPeerFromUrl ? 'guest' : (storedBootstrapPeers.length > 0 ? 'rejoin' : 'host');

  const peer = new Peer(peerId, iceServers ? { config: { iceServers } } : undefined);
  installSignalingReconnect(peer);

  const transport = new PeerJSTransport(meshFacingPeer(peer));
  const mesh = new DandelionMesh<AllEvents>(transport, {
    bootstrapPeers,
    modulusLength: MODULUS_LENGTH,
    cryptoKeyBundle: bundle,
    raftLog: new SessionStorageRaftLog('mental-holdem'),
  });

  mesh.on('ready', () => {
    trackEvent('peer_open', { role, duration_ms: Date.now() - setupStartedAt });
  });
  mesh.on('error', (err) => {
    // PeerJS errors carry a machine-readable `type` (e.g. 'peer-unavailable',
    // 'network', 'server-error'); connection-level errors may not.
    trackEvent('connection_error', {
      error_type: String((err as { type?: string })?.type ?? 'unknown'),
      message: String((err as Error)?.message ?? err).slice(0, 100),
    });
  });
  mesh.on('leaderChanged', (leaderId) => {
    trackEvent('raft_leader_changed', { has_leader: !!leaderId });
  });

  if (bootstrapPeers.length > 0) {
    watchInitialConnection(mesh, bootstrapPeers, role);
  }

  // Re-dial peers whose WebRTC connection dropped (e.g., unstable TURN relay).
  const stopConnectionResilience = enableConnectionResilience(mesh, transport);

  const gameRoom = new GameRoom<AllEvents>(mesh, {
    hostId: bootstrapPeerFromUrl,
  });

  // Persist known peers so we can reconnect after a page refresh
  gameRoom.listener.on('members', (members: string[]) => {
    const otherPeers = members.filter(id => id !== peerId);
    if (otherPeers.length > 0) {
      sessionStorage.setItem(SESSION_BOOTSTRAP_PEERS, JSON.stringify(otherPeers));
    }
  });

  const texasHoldem = new TexasHoldemGameRoom(
    gameRoom,
    new MentalPokerGameRoom(gameRoom),
  );

  const chat = new ChatRoom(gameRoom);

  const stopGameInstrumentation = instrumentGame(texasHoldem, gameRoom);

  window.addEventListener('beforeunload', () => {
    stopGameInstrumentation();
    stopConnectionResilience();
    texasHoldem.close();
    chat.close();
    gameRoom.close();
  });

  return {
    HostId: gameRoom.hostId,
    TexasHoldem: texasHoldem,
    Chat: chat,
  };
}

export const setupReady = initSetup();

// Re-export individual values for backward compatibility.
// These are set once setupReady resolves. Consumers that render after
// setupReady (gated in index.tsx) can use them directly.
export let HostId: string | undefined;
export let TexasHoldem: TexasHoldemGameRoom;
export let Chat: ChatRoom;

setupReady.then(({ HostId: h, TexasHoldem: t, Chat: c }) => {
  HostId = h;
  TexasHoldem = t;
  Chat = c;
});
