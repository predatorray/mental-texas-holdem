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
    } else {
      aliceDeferred.resolve(null);
    }
  }, [aliceDeferred, mentalPokerParticipants, playerId]);
  const handleIfAlice = useCallback((handler: (alice: Player) => void) => {
    aliceDeferred.promise.then(alice => {
      if (!alice) {
        return;
      }
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
      if (!bob) {
        return;
      }
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

  const resetMentalPokerParticipants = () => {
    setMentalPokerParticipants(undefined);
    setSharedPublicKey(undefined);
  };

  return {
    setMentalPokerParticipants,
    setSharedPublicKey,
    handleIfAlice,
    handleIfBob,
    resetMentalPokerParticipants,
  };
}
