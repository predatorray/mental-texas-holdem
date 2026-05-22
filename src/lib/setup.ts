import MentalPokerGameRoom, {MentalPokerEvent} from "./MentalPokerGameRoom";
import GameRoom from "./GameRoom";
import {TexasHoldemGameRoom, TexasHoldemTableEvent} from "./texas-holdem/TexasHoldemGameRoom";
import ChatRoom, {ChatRoomEvent} from "./ChatRoom";
import {
  CryptoKeyBundle,
  DandelionMesh,
  generateKeyBundle,
  PeerJSTransport,
  SessionStorageRaftLog,
} from "dandelion-mesh";

type AllEvents = MentalPokerEvent | ChatRoomEvent | TexasHoldemTableEvent;

const MODULUS_LENGTH = 2048;
const SESSION_KEY_BUNDLE = 'mental-holdem:keyBundle';
const SESSION_PEER_ID = 'mental-holdem:peerId';
const SESSION_BOOTSTRAP_PEERS = 'mental-holdem:bootstrapPeers';

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
 */
async function fetchMeteredIceServers(): Promise<RTCIceServer[] | undefined> {
  const apiKey = process.env.REACT_APP_METERED_API_KEY;
  if (!apiKey) {
    return undefined;
  }
  try {
    const response = await fetch(
      `https://predatorray.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
    );
    if (!response.ok) {
      throw new Error(`metered.ca responded with ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('Failed to fetch ICE servers from metered.ca; falling back to PeerJS defaults.', err);
    return undefined;
  }
}

async function initSetup() {
  const { bundle, peerId } = await getOrCreateSessionKeyBundle();

  const iceServers = await fetchMeteredIceServers();

  const bootstrapPeerFromUrl = new URLSearchParams(window.location.search).get('gameRoomId') ?? undefined;
  const storedBootstrapPeers: string[] = JSON.parse(sessionStorage.getItem(SESSION_BOOTSTRAP_PEERS) || '[]');

  // Use URL param if available, otherwise fall back to stored peers (for refresh survival)
  const bootstrapPeers = bootstrapPeerFromUrl
    ? [bootstrapPeerFromUrl]
    : storedBootstrapPeers;

  const transport = new PeerJSTransport({
    peerId,
    ...(iceServers ? { peerOptions: { config: { iceServers } } } : {}),
  });
  const mesh = new DandelionMesh<AllEvents>(transport, {
    bootstrapPeers,
    modulusLength: MODULUS_LENGTH,
    cryptoKeyBundle: bundle,
    raftLog: new SessionStorageRaftLog('mental-holdem'),
  });

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

  window.addEventListener('beforeunload', () => {
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
