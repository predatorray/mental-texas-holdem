import { EventEmitter } from "eventemitter3";
import Peer, { DataConnection, PeerOptions } from "peerjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { safeStringify, usePrevious } from "./utils";

const PEER_CONNECT_OPTIONS = {
  reliable: true,
  serialization: 'json',
};

export type PeerState = 'connecting' | 'opened' | 'reconnecting' | 'closed';

export type PeerEvents = {
  data: (peerId: string, data: any) => void;
}

export default function usePeer(props: {
  hostId?: string;
  peerOptions?: PeerOptions;
}) {
  const peer = useMemo(() => {
    return props.peerOptions ? new Peer(props.peerOptions) : new Peer();
  }, [props.peerOptions]);

  const previousPeer = usePrevious(peer);
  if (previousPeer && previousPeer !== peer) {
    previousPeer.destroy();
  }

  const [peerState, setPeerState] = useState<PeerState>('connecting');
  const [peerId, setPeerId] = useState<string>();
  const openedPeerPromise = useMemo(() => {
    return new Promise<Peer>(resolve => {
      peer.on('open', peerId => {
        console.info(`Connected to the PeerJS server. (peerId = ${peerId}).`);
        setPeerId(peerId);
        setPeerState('opened');
        resolve(peer);
      });
    });
  }, [peer]);

  // for guest mode: Host's DataConnection
  const hostConnectionPromise: Promise<DataConnection | null> = useMemo(() => {
    return openedPeerPromise.then(openedPeer => new Promise((resolve, reject) => {
      if (!props.hostId) {
        resolve(null);
        return;
      }
      console.info(`Connecting to the remote peer (peerId = ${props.hostId})`);
      const hostConn = openedPeer.connect(props.hostId, PEER_CONNECT_OPTIONS);
      hostConn.on('open', () => {
        console.info(`Connected to the remote peer (peerId = ${props.hostId}) successfully.`);
        resolve(hostConn);
        return;
      });
      hostConn.on('error', error => {
        reject(error);
        return;
      });
      hostConn.on('close', () => {
        console.info(`The remote connection is closed (peerId = ${props.hostId}).`);
      });
      return hostConn;
    }));
  }, [props.hostId, openedPeerPromise]);

  const sendMessageToHost = useCallback(async (data: any) => {
    const hostConnection = await hostConnectionPromise;
    console.debug(`Sending message '${safeStringify(data)}' to the host (peerId = ${props.hostId}).`)
    hostConnection!.send(data);
  }, [hostConnectionPromise, props.hostId]);

  // for host mode: Guests's DataConnections
  const [guestConnectionPromises, setGuestConnectionPromises] = useState<Map<string, Promise<DataConnection>>>(new Map());
  useEffect(() => {
    peer.on('connection', (conn) => {
      const openedConnPromise = new Promise<DataConnection>((resolve, reject) => {
        conn.on('open', () => {
          console.info(`Established connection with the peer (peerId = ${conn.peer}).`);
          resolve(conn);
        }); 
        conn.on('error', error => {
          reject(error);
        });
      });
      setGuestConnectionPromises(curr => {
        const next = new Map(curr);
        next.set(conn.peer, openedConnPromise);
        return next;
      });
      conn.on('close', () => {
        console.info(`The client connection is closed. (peerId = ${conn.peer}).`);
        setGuestConnectionPromises(curr => {
          const next = new Map(curr);
          next.delete(conn.peer);
          return next;
        });
      });
    });
    return () => {
      peer.off('connection');
    };
  }, [peer]);

  const sendMessageToSingleGuest = useCallback(async (guestPeerId: string, data: any) => {
    const guestConn = guestConnectionPromises.get(guestPeerId);
    if (!guestConn) {
      console.warn(`The message '${safeStringify(data)}' is dropped because the connection (peerId = ${guestPeerId}) is not found.`);
      return;
    }
    console.debug(`Sending message '${safeStringify(data)}' to the client (peerId = ${guestPeerId}).`);
    (await guestConn).send(data);
  }, [guestConnectionPromises]);

  const sendMessageToAllGuests = useCallback(async (data: any, exceptPeerId?: string) => {
    if (guestConnectionPromises.size === 0) {
      return;
    }
    if (exceptPeerId) {
      console.debug(`Sending message '${safeStringify(data)}' to all the ${guestConnectionPromises.size} clients except the peer (peerId = ${exceptPeerId}).`);
    } else {
      console.debug(`Sending message '${safeStringify(data)}' to all the ${guestConnectionPromises.size} clients.`);
    }
    for (const [peerId, guestConnectionPromise] of Array.from(guestConnectionPromises.entries())) {
      const guestConnection = await guestConnectionPromise;
      if (guestConnection!.peer !== exceptPeerId) {
        console.debug(`Sending message '${safeStringify(data)}' to the client (peerId = ${peerId}).`);
        await guestConnection!.send(data);
      }
    }
  }, [guestConnectionPromises]);

  const guests = useMemo(() => {
    const guests = Array.from(guestConnectionPromises.keys());
    if (!props.hostId) {
      console.info(`Guest list was updated: ${safeStringify(guests)}`);
    }
    return guests;
  }, [guestConnectionPromises, props.hostId]);

  // emitter
  const peerEventEmitter = useMemo(() => {
    const emitter = new EventEmitter<PeerEvents>();
    (async () => {
      if (props.hostId) {
        const hostConnection = (await hostConnectionPromise)!;
        hostConnection.off('data');
        hostConnection.on('data', (data) => {
          emitter.emit('data', hostConnection.peer, data);
        });
      } else {
        for (const guestConnectionPromise of Array.from(guestConnectionPromises.values())) {
          const guestConnection = await guestConnectionPromise;
          guestConnection.off('data');
          guestConnection.on('data', (data) => {
            emitter.emit('data', guestConnection.peer, data);
          });
        }
      }
    })();
    return emitter;
  }, [props.hostId, hostConnectionPromise, guestConnectionPromises]);
  const previousPeerEventEmitter = usePrevious(peerEventEmitter);
  if (previousPeerEventEmitter && previousPeerEventEmitter !== peerEventEmitter) {
    previousPeerEventEmitter.removeAllListeners();
  }

  if (props.hostId) {
    return {
      peerId,
      peerState,
      sendMessageToHost,
      peerEventEmitter,
    };
  } else {
    return {
      peerId,
      peerState,
      guests,
      sendMessageToSingleGuest,
      sendMessageToAllGuests,
      peerEventEmitter,
    }
  }
}
