import { PeerOptions } from "peerjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DecryptionKey, EncodedDeck, Player, PublicKey, createPlayer, decodeStandardCard, encodeStandardCard, getStandard52Deck } from "mental-poker-toolkit";
import useGameRoom from "./useGameRoom";
import Deferred from "./Deferred";
import EventEmitter from "eventemitter3";
import { CARDS, Community, Hole } from "./rules";

export interface GameStartEvent {
  type: 'start';
  players: string[]; // [small blind, big blind, ..., button]
  mentalPokerSettings: {
    alice: string;
    bob: string;
  };
}

type StringEncodedDeck = string[];

function toStringEncodedDeck(deck: EncodedDeck): StringEncodedDeck {
  return deck.cards.map(i => i.toString());
}

function toBigIntEncodedDeck(deck: StringEncodedDeck): EncodedDeck {
  return new EncodedDeck(deck.map(s => BigInt(s)));
}

export interface DeckStep1Event {
  type: 'deck/step1';
  deck: StringEncodedDeck;
  publicKey: {
    p: string;
    q: string;
  };
}

export interface DeckStep2Event {
  type: 'deck/step2';
  deck: StringEncodedDeck;
}

export interface DeckStep3Event {
  type: 'deck/step3';
  deck: StringEncodedDeck;
}

export interface DeckFinalizedEvent {
  type: 'deck/finalized';
  deck: StringEncodedDeck;
}

export interface DecryptCardEvent {
  type: 'card/decrypt';
  cardOffset: number;
  aliceOrBob: 'alice' | 'bob';
  decryptionKey: { d: string; n: string };
}

export interface BetEvent {
  type: 'bet';
  bet: {
    action: 'call' | 'fold' | 'all-in';
  } | {
    action: 'raise';
    amount: number;
  };
}

export type TexasHoldemEvent =
  | GameStartEvent
  | DeckStep1Event
  | DeckStep2Event
  | DeckStep3Event
  | DeckFinalizedEvent
  | DecryptCardEvent
  | BetEvent
;

interface MentalPokerParticipants {
  alice: string;
  bob: string;
}

interface DecryptionKeyPair {
  alice?: DecryptionKey;
  bob?: DecryptionKey;
}

type TexasHoldemEvents = {[K in TexasHoldemEvent['type']]: (e: ({type: K} & TexasHoldemEvent), fromWhom: string) => void};

function useCommunity(
  players?: string[],
  deck?: EncodedDeck,
  decryptionKeyPairs?: DecryptionKeyPair[],
): Community | null {
  return useMemo(() => {
    // [0] - [4]
    if (!players || !deck || !decryptionKeyPairs) {
      return null;
    }
    if (decryptionKeyPairs[0]?.alice && decryptionKeyPairs[0]?.bob
      && decryptionKeyPairs[1]?.alice && decryptionKeyPairs[1]?.bob
      && decryptionKeyPairs[2]?.alice && decryptionKeyPairs[2]?.bob
      && decryptionKeyPairs[3]?.alice && decryptionKeyPairs[3]?.bob
      && decryptionKeyPairs[4]?.alice && decryptionKeyPairs[4]?.bob
    ) {
      return [
        decodeStandardCard(Number(decryptionKeyPairs[0].alice.decrypt(decryptionKeyPairs[0].bob.decrypt(deck.cards[0])))),
        decodeStandardCard(Number(decryptionKeyPairs[1].alice.decrypt(decryptionKeyPairs[1].bob.decrypt(deck.cards[1])))),
        decodeStandardCard(Number(decryptionKeyPairs[2].alice.decrypt(decryptionKeyPairs[2].bob.decrypt(deck.cards[2])))),
        decodeStandardCard(Number(decryptionKeyPairs[3].alice.decrypt(decryptionKeyPairs[3].bob.decrypt(deck.cards[3])))),
        decodeStandardCard(Number(decryptionKeyPairs[4].alice.decrypt(decryptionKeyPairs[4].bob.decrypt(deck.cards[4])))),
      ];
    } else if (decryptionKeyPairs[0]?.alice && decryptionKeyPairs[0]?.bob
      && decryptionKeyPairs[1]?.alice && decryptionKeyPairs[1]?.bob
      && decryptionKeyPairs[2]?.alice && decryptionKeyPairs[2]?.bob
      && decryptionKeyPairs[3]?.alice && decryptionKeyPairs[3]?.bob
    ) {
      return [
        decodeStandardCard(Number(decryptionKeyPairs[0].alice.decrypt(decryptionKeyPairs[0].bob.decrypt(deck.cards[0])))),
        decodeStandardCard(Number(decryptionKeyPairs[1].alice.decrypt(decryptionKeyPairs[1].bob.decrypt(deck.cards[1])))),
        decodeStandardCard(Number(decryptionKeyPairs[2].alice.decrypt(decryptionKeyPairs[2].bob.decrypt(deck.cards[2])))),
        decodeStandardCard(Number(decryptionKeyPairs[3].alice.decrypt(decryptionKeyPairs[3].bob.decrypt(deck.cards[3])))),
      ];
    } else if (decryptionKeyPairs[0]?.alice && decryptionKeyPairs[0]?.bob
      && decryptionKeyPairs[1]?.alice && decryptionKeyPairs[1]?.bob
      && decryptionKeyPairs[2]?.alice && decryptionKeyPairs[2]?.bob
    ) {
      return [
        decodeStandardCard(Number(decryptionKeyPairs[0].alice.decrypt(decryptionKeyPairs[0].bob.decrypt(deck.cards[0])))),
        decodeStandardCard(Number(decryptionKeyPairs[1].alice.decrypt(decryptionKeyPairs[1].bob.decrypt(deck.cards[1])))),
        decodeStandardCard(Number(decryptionKeyPairs[2].alice.decrypt(decryptionKeyPairs[2].bob.decrypt(deck.cards[2])))),
      ];
    }
    return [];
  }, [players, deck, decryptionKeyPairs]);
}

function useHole(
  players?: string[] | undefined,
  deck?: EncodedDeck | undefined,
  decryptionKeyPairs?: DecryptionKeyPair[] | undefined,
  playerId?: string,
): Hole | null {
  return useMemo(() => {
    if (!players || !deck || !decryptionKeyPairs) {
      return null;
    }
    const playOffset = players.findIndex(v => v === playerId);
    if (playOffset < 0) {
      throw new Error('Cannot find player');
    }
    const holeOffsets = [
      playOffset * 2 + 5,
      playOffset * 2 + 6,
    ];
    if (decryptionKeyPairs[holeOffsets[0]]?.alice && decryptionKeyPairs[holeOffsets[0]]?.bob
      && decryptionKeyPairs[holeOffsets[1]]?.alice && decryptionKeyPairs[holeOffsets[1]]?.bob
    ) {
      return [
        decodeStandardCard(Number(decryptionKeyPairs[holeOffsets[0]].alice!.decrypt(decryptionKeyPairs[holeOffsets[0]].bob!.decrypt(deck.cards[holeOffsets[0]])))),
        decodeStandardCard(Number(decryptionKeyPairs[holeOffsets[1]].alice!.decrypt(decryptionKeyPairs[holeOffsets[1]].bob!.decrypt(deck.cards[holeOffsets[1]])))),
      ];
    } else {
      return null;
    }
  }, [players, deck, decryptionKeyPairs, playerId]);
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

export default function useTexasHoldem(props: {
  gameRoomId?: string;
  peerOptions?: PeerOptions;
}) {
  const [players, setPlayers] = useState<string[]>();
  const [amountsPerPlayer, setAmountsPerPlayer] = useState<Map<string, number>>();
  const [pot, setPot] = useState<number>(0);

  const [deck, setDeck] = useState<EncodedDeck>();
  const [decryptionKeyPairs, setDecryptionKeyPairs] = useState<DecryptionKeyPair[]>();

  const {
    playerId,
    peerState,
    members,
    firePublicEvent,
    firePrivateEvent,
    gameEventEmitter,
  } = useGameRoom<TexasHoldemEvent>({
    gameRoomId: props.gameRoomId,
    peerOptions: props.peerOptions,
  });

  // translate GameEvents into TexasHoldemEvents
  const texasHoldemEventEmitter = useMemo(() => {
    const emitter = new EventEmitter<TexasHoldemEvents>();
    const eventHandler = (e: TexasHoldemEvent, fromWhom: string) => {
      emitter.emit(e.type, e as any, fromWhom);
    };

    gameEventEmitter.off('event');
    gameEventEmitter.on('event', (e, fromWhom) => {
      eventHandler(e, fromWhom);
    });
    return emitter;
  }, [gameEventEmitter]);

  const community = useCommunity(players, deck, decryptionKeyPairs);
  const hole = useHole(players, deck, decryptionKeyPairs, playerId);

  const [mentalPokerParticipants, setMentalPokerParticipants] = useState<MentalPokerParticipants>();
  const [sharedPublicKey, setSharedPublicKey] = useState<PublicKey>();
  const {
    handleIfAlice,
  } = useAlice(mentalPokerParticipants, playerId);
  const {
    handleIfBob,
  } = useBob(mentalPokerParticipants, playerId, sharedPublicKey);

  // start
  useEffect(() => {
    const handler = (e: GameStartEvent) => {
      setPlayers(e.players);
      setMentalPokerParticipants(e.mentalPokerSettings);

      handleIfAlice(alice => {
        console.debug('Encrypting and shuffling the deck by Alice.');
        const standard52Deck = getStandard52Deck();
        const deckEncoded = new EncodedDeck(
          standard52Deck.map((card) => BigInt(encodeStandardCard(card)))
        );
        const deckEncrypted = alice.encryptAndShuffle(deckEncoded);
        firePublicEvent({
          type: 'deck/step1',
          deck: toStringEncodedDeck(deckEncrypted),
          publicKey: {
            p: alice.publicKey.p.toString(),
            q: alice.publicKey.q.toString(),
          }
        });
      });
    };
    texasHoldemEventEmitter.on('start', handler);
    return () => {
      texasHoldemEventEmitter.off('start', handler);
    };
  }, [firePublicEvent, handleIfAlice, texasHoldemEventEmitter]);

  // deck/step1
  useEffect(() => {
    const handler = (e: DeckStep1Event) => {
      const publicKey = new PublicKey(BigInt(e.publicKey.p), BigInt(e.publicKey.q));
      setSharedPublicKey(publicKey);
      handleIfBob(bob => {
        if (!bob) {
          return;
        }
        console.debug('Double-encrypting and shuffling the deck by Bob.');
        const encryptedWithKeyAKeyB = bob.encryptAndShuffle(toBigIntEncodedDeck(e.deck));
        firePublicEvent({
          type: 'deck/step2',
          deck: toStringEncodedDeck(encryptedWithKeyAKeyB),
        });
      });
    };
    texasHoldemEventEmitter.on('deck/step1', handler);
    return () => {
      texasHoldemEventEmitter.off('deck/step1', handler);
    };
  }, [firePublicEvent, handleIfBob, texasHoldemEventEmitter]);

  // deck/step2
  useEffect(() => {
    const handler = (e: DeckStep2Event) => {
      handleIfAlice(alice => {
        const encryptedWithIndividualKeyAKeyB = alice.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
        firePublicEvent({
          type: 'deck/step3',
          deck: toStringEncodedDeck(encryptedWithIndividualKeyAKeyB),
        });
      });
    };
    texasHoldemEventEmitter.on('deck/step2', handler);
    return () => {
      texasHoldemEventEmitter.off('deck/step2', handler);
    };
  }, [firePublicEvent, handleIfAlice, texasHoldemEventEmitter]);

  // deck/step3
  useEffect(() => {
    const handler = (e: DeckStep3Event) => {
      handleIfBob(bob => {
        const encryptedBothKeysIndividually = bob.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
        firePublicEvent({
          type: 'deck/finalized',
          deck: toStringEncodedDeck(encryptedBothKeysIndividually),
        });
      });
    };
    texasHoldemEventEmitter.on('deck/step3', handler);
    return () => {
      texasHoldemEventEmitter.off('deck/step3', handler);
    };
  }, [firePublicEvent, handleIfBob, texasHoldemEventEmitter]);

  // deck/finalized
  useEffect(() => {
    const handler = (e: DeckFinalizedEvent) => {
      setDeck(toBigIntEncodedDeck(e.deck));
      // deal cards if Alice or Bob
      const dealCards = (player: Player, aliceOrBob: 'alice' | 'bob') => {
        let cardOffset = 5;
        for (const playerId of players!) {
          const cardOffsets: [number, number] = [
            cardOffset++,
            cardOffset++,
          ];
          const dk = [
            player.getIndividualKey(cardOffsets[0]).decryptionKey,
            player.getIndividualKey(cardOffsets[1]).decryptionKey,
          ];
          console.info(`Dealing cards [ ${cardOffsets[0]}, ${cardOffsets[1]} ] to the player (peerId = ${playerId}).`);
          firePrivateEvent({
            type: 'card/decrypt',
            cardOffset: cardOffsets[0],
            aliceOrBob,
            decryptionKey: {
              d: dk[0].d.toString(),
              n: dk[0].n.toString(),
            },
          }, playerId);
          firePrivateEvent({
            type: 'card/decrypt',
            cardOffset: cardOffsets[1],
            aliceOrBob,
            decryptionKey: {
              d: dk[1].d.toString(),
              n: dk[1].n.toString(),
            },
          }, playerId);
        }
      }
      handleIfAlice(alice => dealCards(alice, 'alice'));
      handleIfBob(bob => dealCards(bob, 'bob'));
    };
    texasHoldemEventEmitter.on('deck/finalized', handler);
    return () => {
      texasHoldemEventEmitter.off('deck/finalized', handler);
    };
  }, [firePrivateEvent, handleIfAlice, handleIfBob, players, texasHoldemEventEmitter]);

  // card/decrypt
  useEffect(() => {
    const handler = (e: DecryptCardEvent) => {
      const dk = new DecryptionKey(BigInt(e.decryptionKey.d), BigInt(e.decryptionKey.n));
      setDecryptionKeyPairs(curr => {
        const newKeyPairs = curr ? [...curr] : Array(CARDS).fill({});
        console.info(`The decryption key ${e.aliceOrBob} is available for the card [${e.cardOffset}]`);
        switch (e.aliceOrBob) {
          case 'alice':
            newKeyPairs[e.cardOffset] = {
              ...newKeyPairs[e.cardOffset],
              alice: dk,
            };
            break;
          case 'bob':
            newKeyPairs[e.cardOffset] = {
              ...newKeyPairs[e.cardOffset],
              bob: dk,
            };
            break;
        }
        return newKeyPairs;
      });
    };
    texasHoldemEventEmitter.on('card/decrypt', handler);
    return () => {
      texasHoldemEventEmitter.off('card/decrypt', handler);
    };
  }, [texasHoldemEventEmitter]);

  const startGame = useCallback(() => {
    setPlayers(curr => {
      const next = curr ? [...curr.slice(1), curr[0]] : members;
      firePublicEvent({
        type: 'start',
        players: next,
        mentalPokerSettings: {
          alice: next[0],
          bob: next[1],
        },
      });
      return next;
    });
  }, [firePublicEvent, members]);

  return {
    peerState,
    playerId,
    players,
    amountsPerPlayer,
    pot,
    hole,
    community,
    startGame,
  };
}
