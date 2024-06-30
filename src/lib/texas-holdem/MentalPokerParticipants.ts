import { Player, createPlayer, PublicKey } from "mental-poker-toolkit";
import { useMemo, useEffect, useCallback, useState } from "react";
import Deferred from "../Deferred";
import { CARDS } from "../rules";

export default interface MentalPokerParticipants {
  alice: string;
  bob: string;
}

function useAlice(
  mentalPokerParticipants?: MentalPokerParticipants,
  playerId?: string,
) {
  const aliceDeferred: Deferred<Player | null> = useMemo(() => new Deferred(), []);
  useEffect(() => {
    if (!mentalPokerParticipants) {
      return;
    }

    if (playerId === mentalPokerParticipants.alice) {
      console.debug('Creating Alice');
      const alicePromise = createPlayer({
        cards: CARDS,
        bits: 32, // TODO read from settings
      });
      aliceDeferred.resolve(alicePromise);
      aliceDeferred.promise.then(() => {
        console.debug('Alice is ready');
      });
    } else {
      aliceDeferred.resolve(null);
    }
  }, [aliceDeferred, mentalPokerParticipants, playerId]);
  const handleIfAlice = useCallback((handler: (alice: Player) => void) => {
    aliceDeferred.promise.then(alice => {
      console.debug('aliceDeferred is ready');
      if (!alice) {
        console.debug('skipped since not alice');
        return;
      }
      console.debug('handling alice');
      handler(alice);
    });
  }, [aliceDeferred]);
  return {
    handleIfAlice,
  };
}

function useBob(
  mentalPokerParticipants?: MentalPokerParticipants,
  playerId?: string,
  sharedPublicKey?: PublicKey,
) {
  const bobDeferred: Deferred<Player | null> = useMemo(() => new Deferred(), []);
  const handleIfBob = useCallback((handler: (bob: Player) => void) => {
    bobDeferred.promise.then(bob => {
      console.debug('bobDeferred is ready');
      if (!bob) {
        console.debug('skipped since not bob');
        return;
      }
      console.debug('handling bob');
      handler(bob);
    });
  }, [bobDeferred]);

  useEffect(() => {
    if (!mentalPokerParticipants) {
      return;
    }
    if (!sharedPublicKey) {
      return;
    }

    if (playerId === mentalPokerParticipants.bob) {
      console.debug('Creating Bob');
      const bobPromise = createPlayer({
        cards: CARDS,
        publicKey: sharedPublicKey,
        bits: 32, // TODO read from settings
      });
      bobDeferred.resolve(bobPromise);
      bobDeferred.promise.then(() => {
        console.debug('Bob is ready');
      });
    } else {
      bobDeferred.resolve(null);
    }
  }, [bobDeferred, mentalPokerParticipants, playerId, sharedPublicKey]);

  return {
    handleIfBob,
  };
}

export function useMentalPokerParticipants(playerId?: string) {
  const [mentalPokerParticipants, setMentalPokerParticipants] = useState<MentalPokerParticipants>();
  const [sharedPublicKey, setSharedPublicKey] = useState<PublicKey>();
  const {
    handleIfAlice,
  } = useAlice(mentalPokerParticipants, playerId);
  const {
    handleIfBob,
  } = useBob(mentalPokerParticipants, playerId, sharedPublicKey);
  return {
    setMentalPokerParticipants,
    setSharedPublicKey,
    handleIfAlice,
    handleIfBob,
  };
}
