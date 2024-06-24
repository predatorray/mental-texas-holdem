import { PeerOptions } from "peerjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DecryptionKey, EncodedDeck, Player, PublicKey, StandardCard, createPlayer, decodeStandardCard, encodeStandardCard, getStandard52Deck } from "mental-poker-toolkit";
import { safeStringify } from "./utils";
import useGameRoom from "./useGameRoom";
import Deferred from "./Deferred";

const CARDS = 52;

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

export type Hole = [StandardCard, StandardCard];
export type Community =
  | [] // pre-flop
  | [StandardCard, StandardCard, StandardCard] // flop
  | [StandardCard, StandardCard, StandardCard, StandardCard] // turn
  | [StandardCard, StandardCard, StandardCard, StandardCard, StandardCard] // river
;

interface DecryptionKeyPair {
  alice?: DecryptionKey;
  bob?: DecryptionKey;
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
    fireEvent,
    gameEventEmitter,
  } = useGameRoom<TexasHoldemEvent>({
    gameRoomId: props.gameRoomId,
    peerOptions: props.peerOptions,
  });

  const community: Community = useMemo(() => {
    // [0] - [4]
    if (!players || !deck || !decryptionKeyPairs) {
      return [];
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

  const hole = useMemo(() => {
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
      return [];
    }
  }, [players, deck, decryptionKeyPairs, playerId]);

  const firePublicEvent = useCallback((e: TexasHoldemEvent) => {
    fireEvent({
      type: 'public',
      sender: playerId!,
      data: e,
    });
  }, [fireEvent, playerId]);
  const firePrivateEvent = useCallback((e: TexasHoldemEvent, recipient: string) => {
    fireEvent({
      type: 'private',
      sender: playerId!,
      recipient,
      data: e,
    });
  }, [fireEvent, playerId]);

  const aliceDeferred: Deferred<Player | null> = useMemo(() => new Deferred(), []);
  const bobDeferred: Deferred<Player | null> = useMemo(() => new Deferred(), []);
  const [sharedPublicKey, setSharedPublicKey] = useState<PublicKey>();
  const [mentalPokerParticipants, setMentalPokerParticipants] = useState<MentalPokerParticipants>();
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

  // alice
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

  // bob
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

  useEffect(() => {
    const eventHandler = (e: TexasHoldemEvent, fromWhom: string) => {
      console.debug(`Received TexasHoldemEvent: ${safeStringify(e)}`);
      if (!e || !e.type) {
        console.error('missing event or type');
        return;
      }
      console.info(`Processing TexasHoldemEvent of type '${e.type}'.`);
      switch (e.type) {
        case 'start':
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
          break;
        case 'deck/step1':
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
          break;
        case 'deck/step2':
          handleIfAlice(alice => {
            const encryptedWithIndividualKeyAKeyB = alice.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
            firePublicEvent({
              type: 'deck/step3',
              deck: toStringEncodedDeck(encryptedWithIndividualKeyAKeyB),
            });
          });
          break;
        case 'deck/step3':
          handleIfBob(bob => {
            const encryptedBothKeysIndividually = bob.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
            firePublicEvent({
              type: 'deck/finalized',
              deck: toStringEncodedDeck(encryptedBothKeysIndividually),
            });
          });
          break;
        case 'deck/finalized':
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
          break;
        case 'card/decrypt':
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
          break;
        case 'bet':
          // TODO
          switch (e.bet.action) {
            case 'call':
              break;
            case 'raise':
              break;
            case 'fold':
              break;
            case 'all-in':
              break;
          }
          break;
      }
    };

    gameEventEmitter.on('event', eventHandler);
    return () => {
      gameEventEmitter.off('event', eventHandler);
    };
  }, [deck, firePrivateEvent, firePublicEvent, gameEventEmitter, handleIfAlice, handleIfBob, players]);

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
