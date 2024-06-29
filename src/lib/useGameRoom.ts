import { useCallback, useEffect, useMemo, useState } from "react";
import usePeer from "./usePeer";
import { PeerOptions } from "peerjs";
import { safeStringify, usePrevious } from "./utils";
import EventEmitter from "eventemitter3";

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

type InternalEvent = {
  type: '_members';
  data: string[];
}

// type EventTypes<T> = {[K in GameEvent<T>['type']]: (e: ({type: K} & GameEvent<T>)) => void};

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
        }
      }
    });
    return emitter;
  }, [peerEventEmitter, peerId, props.gameRoomId, sendMessageToAllGuests, sendMessageToSingleGuest]);
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

  const membersOnHost: string[] = useMemo(() => peerId ? [peerId, ...(guests || [])] : [], [peerId, guests]);
  const [membersSyncedFromHost, setMembersSyncedFromHost] = useState<string[]>([]);

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
    members: props.gameRoomId ? membersSyncedFromHost : membersOnHost,
    firePublicEvent,
    firePrivateEvent,
  };
}
