import { PeerOptions } from "peerjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DecryptionKey, EncodedDeck, Player, PublicKey, encodeStandardCard, getStandard52Deck } from "mental-poker-toolkit";
import useGameRoom from "../useGameRoom";
import { useMap, useSet } from "../utils";
import { useDecryptionKeyPair } from "./DecryptionKeyPair";
import useBoard from "./useBoard";
import useHole from "./useHole";
import { useMentalPokerParticipants } from "./MentalPokerParticipants";
import useTexasHoldemEventEmitter from "./useTexasHoldemEventEmitter";
import { StringEncodedDeck, TexasHoldemEvent, GameStartEvent, DeckStep1Event, DeckStep2Event, DeckStep3Event, DeckFinalizedEvent, DecryptCardEvent, ActionEvent } from "./events";

function toStringEncodedDeck(deck: EncodedDeck): StringEncodedDeck {
  return deck.cards.map(i => i.toString());
}

function toBigIntEncodedDeck(deck: StringEncodedDeck): EncodedDeck {
  return new EncodedDeck(deck.map(s => BigInt(s)));
}

export default function useTexasHoldem(props: {
  gameRoomId?: string;
  peerOptions?: PeerOptions;
}) {
  const [players, setPlayers] = useState<string[]>();
  const [amountsPerPlayer, setAmountsPerPlayer] = useState<Map<string, number>>();
  const [pot, setPot] = useState<number>(0);

  const [deck, setDeck] = useState<EncodedDeck>();
  const {
    decryptionKeyPairs,
    setAliceDecryptionKey,
    setBobDecryptionKey,
  } = useDecryptionKeyPair();

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

  const texasHoldemEventEmitter = useTexasHoldemEventEmitter(gameEventEmitter);

  const board = useBoard(players, deck, decryptionKeyPairs);
  const hole = useHole(players, deck, decryptionKeyPairs, playerId);

  const {
    setMentalPokerParticipants,
    setSharedPublicKey,
    handleIfAlice,
    handleIfBob,
  } = useMentalPokerParticipants(playerId);

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
  }, [firePublicEvent, handleIfAlice, setMentalPokerParticipants, texasHoldemEventEmitter]);

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
  }, [firePublicEvent, handleIfBob, setSharedPublicKey, texasHoldemEventEmitter]);

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
      switch (e.aliceOrBob) {
        case 'alice':
          setAliceDecryptionKey(dk, e.cardOffset);
          break;
        case 'bob':
          setBobDecryptionKey(dk, e.cardOffset);
          break;
      }
    }
    texasHoldemEventEmitter.on('card/decrypt', handler);
    return () => {
      texasHoldemEventEmitter.off('card/decrypt', handler);
    };
  }, [setAliceDecryptionKey, setBobDecryptionKey, texasHoldemEventEmitter]);

  const smallBlind = useMemo(() => players ? players[0] : undefined, [players]);
  const bigBlind = useMemo(() => players ? players[1] : undefined, [players]);
  const button = useMemo(() => players ? players[players.length - 1] : undefined, [players]);
  const [betsPerPlayer] = useMap<string, number>(); // TODO sb and bb
  const [bankrolls] = useMap<string, number>();
  const [allInPlayers, addAllInPlayers, removeAllInPlayers] = useSet<string>();
  const [lastPlayerWhoRaised, setLastPlayerWhoRaised] = useState<string>();
  const betOrder = useMemo(() => {
    if (!players) {
      return null; // no one's turn
    }
    const raisedPlayerOffset = lastPlayerWhoRaised
      ? players!.findIndex(p => p === lastPlayerWhoRaised)
      : 2 % players.length; // player next to bb
    return [
      ...players.slice(raisedPlayerOffset),
      ...players.slice(0, raisedPlayerOffset),
    ];
  }, [lastPlayerWhoRaised, players]);
  const whoseTurn = useMemo(() => {
    if (!betOrder) {
      return null; // no one's turn
    }
    let smallestBet: number | undefined;
    for (const player of betOrder) {
      if (allInPlayers.has(player)) {
        continue;
      }
      const bet = betsPerPlayer.get(player);
      if (!bet) {
        return player;
      }
      if (!smallestBet) {
        smallestBet = bet;
        continue;
      }
      if (bet < smallestBet) {
        return player;
      }
    }
    return null;
  }, [allInPlayers, betOrder, betsPerPlayer]);

  // bet
  useEffect(() => {
    const handler = (e: ActionEvent) => {
      // TODO
      ;
    };
    texasHoldemEventEmitter.on('action', handler);
    return () => {
      texasHoldemEventEmitter.off('action', handler);
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
    board,
    startGame,
    whoseTurn,
    smallBlind,
    bigBlind,
    button,
  };
}
