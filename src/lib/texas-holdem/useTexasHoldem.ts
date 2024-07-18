import { PeerOptions } from "peerjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DecryptionKey, EncodedDeck, Player, PublicKey, encodeStandardCard, getStandard52Deck } from "mental-poker-toolkit";
import useGameRoom from "../useGameRoom";
import { useDecryptionKeyPair } from "./DecryptionKeyPair";
import useBoard from "./useBoard";
import useHole from "./useHole";
import { useMentalPokerParticipants } from "./MentalPokerParticipants";
import useTexasHoldemEventEmitter from "./useTexasHoldemEventEmitter";
import { StringEncodedDeck, TexasHoldemEvent, GameStartEvent, DeckStep1Event, DeckStep2Event, DeckStep3Event, DeckFinalizedEvent, DecryptCardEvent, ActionEvent } from "./events";
import useBankrollsAndBet from "./useBankrollsAndBet";
import useWhoseTurn from "./useWhoseTurn";

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

  const {
    board,
    stage: boardStage,
    isDealingCards,
    dealingCards,
  } = useBoard(players, deck, decryptionKeyPairs);
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
      const dealHoleCards = (player: Player, aliceOrBob: 'alice' | 'bob') => {
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
      handleIfAlice(alice => dealHoleCards(alice, 'alice'));
      handleIfBob(bob => dealHoleCards(bob, 'bob'));
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

  const {
    smallBlind,
    bigBlind,
    button,
    bankrolls,
    betsPerPlayer,
    allInPlayers,
    foldedPlayers,
    calledPlayers,
    bet,
    fold,
  } = useBankrollsAndBet(100, boardStage, players); // TODO read 100 from settings

  const {
    whoseTurn,
    nextPlayersTurn,
    clearWhoseTurn,
  } = useWhoseTurn(allInPlayers, foldedPlayers, calledPlayers, boardStage, players);

  // action
  useEffect(() => {
    const handler = (e: ActionEvent, whom: string) => {
      switch (e.action) {
        case 'bet':
          if (bet(whom, e.amount)) {
            nextPlayersTurn();
          }
          break;
        case 'fold':
          fold(whom);
          nextPlayersTurn();
          break;
      }
    };
    texasHoldemEventEmitter.on('action', handler);
    return () => {
      texasHoldemEventEmitter.off('action', handler);
    };
  }, [playerId, fold, bet, texasHoldemEventEmitter, nextPlayersTurn]);

  useEffect(() => {
    // if everyone is either called, all-in or folded, flop
    if (!players || !boardStage) {
      return;
    }
    for (const player of players) {
      if (!calledPlayers.has(player) && !allInPlayers.has(player) && !foldedPlayers.has(player)) {
        return;
      }
    }
    // and no one needs to do any action
    if (whoseTurn) {
      return;
    }

    if (isDealingCards) {
      return;
    }

    clearWhoseTurn();
    // deal cards
    switch (boardStage) {
      case 'Preflop': // pre-flop to flop
        dealingCards();
        const showFlopCards = (player: Player, aliceOrBob: 'alice' | 'bob') => {
          const flopCardOffsets = [0, 1, 2];
          console.info(`Showing cards [ ${flopCardOffsets[0]}, ${flopCardOffsets[1]}, ${flopCardOffsets[2]} ] to all the players.`);
          for (const flopCardOffset of flopCardOffsets) {
            const dk = player.getIndividualKey(flopCardOffset).decryptionKey;
            firePublicEvent({
              type: 'card/decrypt',
              cardOffset: flopCardOffset,
              aliceOrBob,
              decryptionKey: {
                d: dk.d.toString(),
                n: dk.n.toString(),
              },
            });
          }
        };
        handleIfAlice(alice => showFlopCards(alice, 'alice'));
        handleIfBob(bob => showFlopCards(bob, 'bob'));
        break;
      case 'Flop': // flop to turn
        dealingCards();
        const showTurnCard = (player: Player, aliceOrBob: 'alice' | 'bob') => {
          const turnCardOffset = 3;
          console.info(`Showing card [ ${turnCardOffset} ] to all the players.`);
          const dk = player.getIndividualKey(turnCardOffset).decryptionKey;
          firePublicEvent({
            type: 'card/decrypt',
            cardOffset: turnCardOffset,
            aliceOrBob,
            decryptionKey: {
              d: dk.d.toString(),
              n: dk.n.toString(),
            },
          });
        };
        handleIfAlice(alice => showTurnCard(alice, 'alice'));
        handleIfBob(bob => showTurnCard(bob, 'bob'));
        break;
      case 'Turn': // turn to river
        dealingCards();
        const showRiverCard = (player: Player, aliceOrBob: 'alice' | 'bob') => {
          const riverCardOffset = 4;
          console.info(`Showing card [ ${riverCardOffset} ] to all the players.`);
          const dk = player.getIndividualKey(riverCardOffset).decryptionKey;
          firePublicEvent({
            type: 'card/decrypt',
            cardOffset: riverCardOffset,
            aliceOrBob,
            decryptionKey: {
              d: dk.d.toString(),
              n: dk.n.toString(),
            },
          });
        };
        handleIfAlice(alice => showRiverCard(alice, 'alice'));
        handleIfBob(bob => showRiverCard(bob, 'bob'));
        break;
      case 'River': // show cards
        console.info('Show cards');
        break;
    }
  }, [allInPlayers, calledPlayers, foldedPlayers, firePublicEvent, handleIfAlice, handleIfBob, players, boardStage, whoseTurn, clearWhoseTurn, isDealingCards, dealingCards]);

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

  const fireBet = useCallback((amount: number) => {
    firePublicEvent({
      type: 'action',
      action: 'bet',
      amount,
    });
  }, [firePublicEvent]);

  const fireFold = useCallback(() => {
    firePublicEvent({
      type: 'action',
      action: 'fold',
    });
  }, [firePublicEvent]);

  return {
    peerState,
    playerId,
    players,
    amountsPerPlayer,
    pot,
    hole,
    board,
    whoseTurn,
    smallBlind,
    bigBlind,
    button,
    startGame,
    bankrolls,
    betsPerPlayer,
    actions: {
      fireBet,
      fireFold,
    },
  };
}
