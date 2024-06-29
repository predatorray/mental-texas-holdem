import { useCallback, useEffect, useMemo, useState } from "react";
import usePeer from "./usePeer";
import { PeerOptions } from "peerjs";
import { safeStringify, usePrevious } from "./utils";
import EventEmitter from "eventemitter3";
import Deferred from "./Deferred";

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
  jwk: JsonWebKey;
}

type InternalEvent =
  | MembersChangedEvent
  | PublicKeyEvent
;

export type GameRoomState = 'unready' | 'ready';

type GameRoomEvents<T> = {
  event: (e: T, fromWhom: string) => void;
}

export default function useGameRoom<T>(props: {
  gameRoomId?: string;
  peerOptions?: PeerOptions;
}) {
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
    peerOptions: props.peerOptions,
  });

  const [rsaKeyPair, setRsaKeyPair] = useState<CryptoKeyPair>();
  const [rsaPublicKeys, setRsaPublicKeys] = useState<Map<string, Deferred<CryptoKey>>>(new Map());

  const gameEventEmitter = useMemo(() => {
    const emitter = new EventEmitter<GameRoomEvents<T>>();

    peerEventEmitter.off('data');
    peerEventEmitter.on('data', (whom, e: GameEvent<T> | InternalEvent) => {
      if (props.gameRoomId) {
        // receiving (guest only)
        console.debug(`Received GameEvent: ${safeStringify(e)}`);
        if (!e || !e.type) {
          console.error('missing event or type');
          return;
        }
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
            const rsaPublicKeyDeferred = rsaPublicKeys.get(whom);
            if (rsaPublicKeyDeferred) {
              rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
            } else {
              // in case _publicKey event arrives before _members
              setRsaPublicKeys(curr => {
                if (curr.has(whom)) {
                  return curr;
                }
                const next = new Map(curr);
                const deferred = new Deferred<CryptoKey>();
                next.set(whom, deferred);
                deferred.resolve(rsaPulbicKeyPromise);
                return next;
              });
            }
            break;
        }
      } else {
        // broadcasting (host only)
        console.debug(`Received GameEvent: ${safeStringify(e)}`);
        if (!e || !e.type) {
          console.error('missing event or type');
          return;
        }
        switch (e.type) {
          case 'private':
            if (e.recipient !== peerId) {
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
            const rsaPublicKeyDeferred = rsaPublicKeys.get(whom);
            if (rsaPublicKeyDeferred) {
              rsaPublicKeyDeferred.resolve(rsaPulbicKeyPromise);
            } else {
              // in case _publicKey event arrives before _members
              setRsaPublicKeys(curr => {
                if (curr.has(whom)) {
                  return curr;
                }
                const next = new Map(curr);
                const deferred = new Deferred<CryptoKey>();
                next.set(whom, deferred);
                deferred.resolve(rsaPulbicKeyPromise);
                return next;
              });
            }
            break;
        }
      }
    });
    return emitter;
  }, [peerEventEmitter, peerId, props.gameRoomId, rsaPublicKeys, sendMessageToAllGuests, sendMessageToSingleGuest]);
  const previousGameEventEmitter = usePrevious(gameEventEmitter);
  if (previousGameEventEmitter && previousGameEventEmitter !== gameEventEmitter) {
    previousGameEventEmitter.removeAllListeners();
  }

  const fireEventFromHost = useCallback((e: GameEvent<T>) => {
    console.debug(`Sending GameEvent: ${safeStringify(e)}.`);
    switch (e.type) {
      case 'private':
        if (e.recipient !== peerId) {
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
    console.debug(`Sending GameEvent: ${safeStringify(e)}.`);
    sendMessageToHost!(e);
    gameEventEmitter.emit('event', e.data, peerId!); // echo
  }, [gameEventEmitter, peerId, sendMessageToHost]);

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
  useEffect(() => {
    window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt'],
    ).then(keyPair => {
      setRsaKeyPair(keyPair);
    });
  }, []);
  // publish public key
  useEffect(() => {
    if (!rsaKeyPair) {
      return;
    }

    window.crypto.subtle.exportKey(
      'jwk',
      rsaKeyPair.publicKey,
    ).then(jwk => {
      const publicKeyEvent: PublicKeyEvent = {
        type: '_publicKey',
        jwk,
      };
      return publicKeyEvent;
    }).then(publicKeyEvent => {
      if (!props.gameRoomId) {
        sendMessageToAllGuests!(publicKeyEvent);
      } else {
        sendMessageToHost!(publicKeyEvent);
      }
    });
  }, [props.gameRoomId, rsaKeyPair, sendMessageToAllGuests, sendMessageToHost]);

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
