import { useCallback, useEffect, useMemo, useState } from "react";
import usePeer, { PeerServerOptions } from "./usePeer";
import { arrayBufferToHex, hexToArrayBuffer, usePrevious } from "./utils";
import EventEmitter from "eventemitter3";
import Deferred from "./Deferred";
import { decrypt, encrypt } from "./HybridPublicKeyCrypto";

export interface PublicGameEvent<T> {
  type: 'public';
  sender: string;
  data: T;
}

export interface PrivateGameEvent<T> {
  type: 'private';
  sender: string;
  recipient: string;
  data: T;
};

export type GameEvent<T> = PublicGameEvent<T> | PrivateGameEvent<T>;

interface MembersChangedEvent {
  type: '_members';
  data: string[];
}

interface PublicKeyEvent {
  type: '_publicKey';
  sender: string;
  jwk: JsonWebKey;
}

interface EncryptedPrivateGameEvent {
  type: '_encrypted';
  sender: string;
  recipient: string;
  cipherHex: string;
}

type InternalEvent =
  | MembersChangedEvent
  | PublicKeyEvent
  | EncryptedPrivateGameEvent
;

export type GameRoomState = 'unready' | 'ready';

export type GameRoomEvents<T> = {
  event: (e: T, fromWhom: string) => void;
}

export default function useGameRoom<T>(props: {
  gameRoomId?: string;
} & PeerServerOptions) {
  const {
    peerId,
    peerState,
    guests,
    sendMessageToHost,
    sendMessageToSingleGuest,
    sendMessageToAllGuests,
    peerEventEmitter,
  } = usePeer({
    hostId: props.gameRoomId,
    ...props,
  });
  const rsaKeyPairPromise = useMemo(() => {
    return window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    );
  }, []);
  const [rsaPublicKeys, setRsaPublicKeys] = useState<Map<string, Deferred<CryptoKey>>>(new Map());

  const gameEventEmitter = useMemo(() => {
    const emitter = new EventEmitter<GameRoomEvents<T>>();

    peerEventEmitter.off('data');
    peerEventEmitter.on('data', (whom, e: GameEvent<T> | InternalEvent) => {
      if (!e || !e.type) {
        console.error('[GameRoom] missing event or type');
        return;
      }
      console.info(`[GameRoom] Received GameEvent ${e.type} from ${whom}.`);
      console.debug(e);
      if (props.gameRoomId) {
        // guest mode
        switch (e.type) {
          case 'private':
            if (e.recipient === peerId) {
              emitter.emit('event', e.data, e.sender);
            }
            break;
          case 'public':
            emitter.emit('event', e.data, e.sender);
            break;
          case '_members':
            setMembersSyncedFromHost(e.data);
            break;
          case '_publicKey':
            const rsaPulbicKeyPromise = window.crypto.subtle.importKey(
              'jwk',
              e.jwk,
              {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
              },
              false,
              ['encrypt'],
            );
            const rsaPublicKeyDeferred = rsaPublicKeys.get(e.sender);
            if (rsaPublicKeyDeferred) {
              rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
            } else {
              // in case _publicKey event arrives before _members
              setRsaPublicKeys(curr => {
                if (curr.has(e.sender)) {
                  return curr;
                }
                const next = new Map(curr);
                const deferred = new Deferred<CryptoKey>();
                next.set(e.sender, deferred);
                deferred.resolve(rsaPulbicKeyPromise);
                return next;
              });
            }
            break;
          case '_encrypted':
            // decrypt using own private key and emit the decrypted PrivateGameEvent
            rsaKeyPairPromise.then(rsaKeyPair => {
              decrypt(
                hexToArrayBuffer(e.cipherHex),
                rsaKeyPair!.privateKey,
              ).then(decryptedData => {
                const data = JSON.parse(new TextDecoder().decode(decryptedData));
                emitter.emit('event', data, whom);
              });
            });
            break;
        }
      } else {
        // host mode
        switch (e.type) {
          case 'private':
            if (e.recipient !== peerId) {
              console.warn(`[GameRoom] Received a private message in plaintext (sender = ${whom}, recipient = ${e.recipient}).`);
              sendMessageToSingleGuest!(e.recipient, e);
            } else {
              emitter.emit('event', e.data, whom);
            }
            break;
          case 'public':
            sendMessageToAllGuests!(e, whom);
            emitter.emit('event', e.data, whom);
            break;
          case '_publicKey':
            sendMessageToAllGuests!(e, whom);
            const rsaPulbicKeyPromise = window.crypto.subtle.importKey(
              'jwk',
              e.jwk,
              {
                name: 'RSA-OAEP',
                hash: 'SHA-256',
              },
              false,
              ['encrypt'],
            );
            const rsaPublicKeyDeferred = rsaPublicKeys.get(e.sender);
            if (rsaPublicKeyDeferred) {
              rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
            } else {
              // in case _publicKey event arrives before _members
              setRsaPublicKeys(curr => {
                if (curr.has(e.sender)) {
                  return curr;
                }
                const next = new Map(curr);
                const deferred = new Deferred<CryptoKey>();
                next.set(e.sender, deferred);
                deferred.resolve(rsaPulbicKeyPromise);
                return next;
              });
            }
            break;
          case '_encrypted':
            if (e.recipient === peerId) {
              // decrypt using host's private key and emit the decrypted PrivateGameEvent
              rsaKeyPairPromise.then(rsaKeyPair => {
                decrypt(
                  hexToArrayBuffer(e.cipherHex),
                  rsaKeyPair!.privateKey,
                ).then(decryptedData => {
                  const data = JSON.parse(new TextDecoder().decode(decryptedData));
                  emitter.emit('event', data, whom);
                });
              });
            } else {
              sendMessageToSingleGuest!(e.recipient, e);
            }
            break;
        }
      }
    });
    return emitter;
  }, [peerEventEmitter, peerId, props.gameRoomId, rsaKeyPairPromise, rsaPublicKeys, sendMessageToAllGuests, sendMessageToSingleGuest]);
  const previousGameEventEmitter = usePrevious(gameEventEmitter);
  if (previousGameEventEmitter && previousGameEventEmitter !== gameEventEmitter) {
    previousGameEventEmitter.removeAllListeners();
  }

  const fireEventFromHost = useCallback((e: GameEvent<T>) => {
    console.info(`[GameRoom] Sending GameEvent ${e.type}.`);
    console.debug(e);
    switch (e.type) {
      case 'private':
        if (e.recipient !== peerId) {
          // when sending private messages from host,
          // encryption is not required, since the connection is end-to-end with a relay.
          sendMessageToSingleGuest!(e.recipient, e);
        } else {
          gameEventEmitter.emit('event', e.data, peerId!); // echo
        }
        break;
      case 'public':
        sendMessageToAllGuests!(e);
        gameEventEmitter.emit('event', e.data, peerId!); // echo
        break;
    }
  }, [gameEventEmitter, peerId, sendMessageToAllGuests, sendMessageToSingleGuest]);

  const fireEventFromGuest = useCallback((e: GameEvent<T>) => {
    console.info(`[GameRoom] Sending GameEvent ${e.type}.`);
    console.debug(e);
    if (e.type === 'private') {
      // when sending private message from guest,
      // encryption is required, since host is acting as a relay, who can potentially see the plaintext
      rsaPublicKeys.get(e.recipient)!.promise.then(recipientPublicKey => {
        const dataAsBuffer = new TextEncoder().encode(JSON.stringify(e.data));
        encrypt(dataAsBuffer, recipientPublicKey).then(encrypted => {
          const encryptedHex = arrayBufferToHex(encrypted);
          const encryptedEvent: EncryptedPrivateGameEvent = {
            type: '_encrypted',
            sender: e.sender,
            recipient: e.recipient,
            cipherHex: encryptedHex,
          };
          sendMessageToHost!(encryptedEvent);
        });
      });
    } else {
      sendMessageToHost!(e);
    }
    gameEventEmitter.emit('event', e.data, peerId!); // echo
  }, [gameEventEmitter, peerId, rsaPublicKeys, sendMessageToHost]);

  // members
  const membersOnHost: string[] = useMemo(() => peerId ? [peerId, ...(guests || [])] : [], [peerId, guests]);
  const [membersSyncedFromHost, setMembersSyncedFromHost] = useState<string[]>([]);
  const members: string[] = useMemo(() => {
    return props.gameRoomId ? membersSyncedFromHost : membersOnHost;
  }, [props.gameRoomId, membersOnHost, membersSyncedFromHost]);
  const previousMembers = usePrevious(members);
  const membersAdded: string[] = useMemo(() => {
    if  (!previousMembers) {
      return members;
    }
    return members.filter(m => !previousMembers.includes(m));
  }, [members, previousMembers]);
  const membersRemoved: string[] = useMemo(() => {
    if  (!previousMembers) {
      return [];
    }
    return previousMembers.filter(m => !members.includes(m));
  }, [members, previousMembers]);

  // members changed (host only)
  useEffect(() => {
    if (!props.gameRoomId) {
      const membersChanged = {
        type: '_members',
        data: membersOnHost,
      }
      sendMessageToAllGuests!(membersChanged);
    }
  }, [membersOnHost, props.gameRoomId, sendMessageToAllGuests]);

  // RSA keys
  useEffect(() => {
    setRsaPublicKeys(curr => {
      const next = new Map(curr);
      for (const memberRemoved of membersRemoved) {
        next.delete(memberRemoved);
      };
      for (const memberAdded of membersAdded) {
        // RsaPublicKeys may be updated before the member list is changed.
        // e.g. _publicKey event is processed before _member event.
        if (!next.has(memberAdded)) {
          next.set(memberAdded, new Deferred());
        }
      }
      return next;
    });
  }, [membersAdded, membersRemoved]);
  // publish public key
  useEffect(() => {
    (async () => {
      const rsaKeyPair = await rsaKeyPairPromise;
      const jwk = await window.crypto.subtle.exportKey(
        'jwk',
        rsaKeyPair.publicKey,
      );
      const publicKeyEvent: PublicKeyEvent = {
        type: '_publicKey',
        sender: peerId!,
        jwk,
      };
      if (!props.gameRoomId) {
        sendMessageToAllGuests!(publicKeyEvent);
      } else {
        sendMessageToHost!(publicKeyEvent);
      }
    })();
  }, [peerId, props.gameRoomId, rsaKeyPairPromise, sendMessageToAllGuests, sendMessageToHost]);

  const fireEvent = useMemo(() => {
    return props.gameRoomId ? fireEventFromGuest : fireEventFromHost
  }, [fireEventFromGuest, fireEventFromHost, props.gameRoomId]);

  const firePublicEvent = useCallback((e: T) => {
    fireEvent({
      type: 'public',
      sender: peerId!,
      data: e,
    });
  }, [fireEvent, peerId]);

  const firePrivateEvent = useCallback((e: T, recipient: string) => {
    fireEvent({
      type: 'private',
      sender: peerId!,
      recipient,
      data: e,
    });
  }, [fireEvent, peerId]);

  return {
    gameEventEmitter,
    playerId: peerId,
    peerState,
    members,
    firePublicEvent,
    firePrivateEvent,
  };
}
