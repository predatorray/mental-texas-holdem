import {useCallback, useEffect, useMemo, useState} from "react";
import {
  DecryptionKey,
  EncodedDeck,
  Player,
  PublicKey,
  encodeStandardCard,
  getStandard52Deck,
} from "mental-poker-toolkit";
import { useDecryptionKeyPair } from "./DecryptionKeyPair";
import useBoard from "./useBoard";
import useHole from "./useHole";
import { useMentalPokerParticipants } from "./MentalPokerParticipants";
import {
  StringEncodedDeck,
  TexasHoldemEvent,
  GameStartEvent,
  DeckStep1Event,
  DeckStep2Event,
  DeckStep3Event,
  DeckFinalizedEvent,
  DecryptCardEvent,
  ActionEvent,
  TexasHoldemEvents,
} from "./events";
import useBankrollsAndBet from "./useBankrollsAndBet";
import useWhoseTurn from "./useWhoseTurn";
import EventEmitter from "eventemitter3";
import { PeerServerOptions } from "../usePeer";
import useShowdown, {ShowdownResult} from "./useShowdown";
import {GameRoomEvents, GameRoomStatus} from "../GameRoom";
import useTexasHoldemEventEmitter from "./useTexasHoldemEventEmitter";
import TexasHoldemGameRoom from "./TexasHoldemGameRoom";

function toStringEncodedDeck(deck: EncodedDeck): StringEncodedDeck {
  return deck.cards.map(i => i.toString());
}

function toBigIntEncodedDeck(deck: StringEncodedDeck): EncodedDeck {
  return new EncodedDeck(deck.map(s => BigInt(s)));
}

function useTexasHoldemEvent<E extends TexasHoldemEvent['type']>(
  texasHoldemEventEmitter: EventEmitter<TexasHoldemEvents>,
  e: E,
  callback: (...args: EventEmitter.ArgumentMap<TexasHoldemEvents>[E]) => void,
) {
  useEffect(() => {
    texasHoldemEventEmitter.on(e, callback);
    return () => {
      texasHoldemEventEmitter.off(e, callback);
    };
  }, [callback, e, texasHoldemEventEmitter]);
}

const firePublicEvent = async (e: TexasHoldemEvent) => {
  await TexasHoldemGameRoom.emitEvent({
    type: 'public',
    sender: await TexasHoldemGameRoom.peerIdAsync,
    data: e,
  });
};

const firePrivateEvent = async (e: TexasHoldemEvent, recipient: string) => {
  await TexasHoldemGameRoom.emitEvent({
    type: 'private',
    sender: await TexasHoldemGameRoom.peerIdAsync,
    recipient,
    data: e,
  });
};

const TexasHoldemGameRoomSingletonEventEmitter = new EventEmitter<GameRoomEvents<TexasHoldemEvent>>();
TexasHoldemGameRoom.onEvent((e, fromWhom) => {
  TexasHoldemGameRoomSingletonEventEmitter.emit('event', e.data, fromWhom);
});

export default function useTexasHoldem() {
  const [peerId, setPeerId] = useState<string>();
  useEffect(() => {
    const peerIdListener = (peerIdAssigned: string) => setPeerId(peerIdAssigned);
    TexasHoldemGameRoom.listener.on('connected', peerIdListener);
    return () => {
      TexasHoldemGameRoom.listener.off('connected', peerIdListener);
    }
  }, []);

  const [status, setStatus] = useState<GameRoomStatus>();
  useEffect(() => {
    const statusListener = (statusChanged: GameRoomStatus) => setStatus(statusChanged);
    TexasHoldemGameRoom.listener.on('status', statusListener);
    return () => {
      TexasHoldemGameRoom.listener.off('status', statusListener);
    }
  }, []);

  const [players, setPlayers] = useState<string[]>();

  const [deck, setDeck] = useState<EncodedDeck>();
  const {
    decryptionKeyPairs,
    setAliceDecryptionKey,
    setBobDecryptionKey,
    resetDecryptionKeyPairs,
  } = useDecryptionKeyPair();

  const {
    board,
    stage: boardStage,
    isDealingCards,
    dealingCards,
  } = useBoard(players, deck, decryptionKeyPairs);
  const hole = useHole(players, deck, decryptionKeyPairs, peerId);

  const texasHoldemEventEmitter = useTexasHoldemEventEmitter(TexasHoldemGameRoomSingletonEventEmitter);

  const {
    setMentalPokerParticipants,
    setSharedPublicKey,
    handleIfAlice,
    handleIfBob,
    resetMentalPokerParticipants,
  } = useMentalPokerParticipants(peerId);

  // start
  useTexasHoldemEvent(texasHoldemEventEmitter, 'start', useCallback((e: GameStartEvent) => {
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
  }, [handleIfAlice, setMentalPokerParticipants]));

  // deck/step1
  useTexasHoldemEvent(texasHoldemEventEmitter, 'deck/step1', useCallback((e: DeckStep1Event) => {
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
  }, [handleIfBob, setSharedPublicKey]));

  // deck/step2
  useTexasHoldemEvent(texasHoldemEventEmitter, 'deck/step2', useCallback((e: DeckStep2Event) => {
    handleIfAlice(alice => {
      const encryptedWithIndividualKeyAKeyB = alice.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
      firePublicEvent({
        type: 'deck/step3',
        deck: toStringEncodedDeck(encryptedWithIndividualKeyAKeyB),
      });
    });
  }, [handleIfAlice]));

  // deck/step3
  useTexasHoldemEvent(texasHoldemEventEmitter, 'deck/step3', useCallback((e: DeckStep3Event) => {
    handleIfBob(bob => {
      const encryptedBothKeysIndividually = bob.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
      firePublicEvent({
        type: 'deck/finalized',
        deck: toStringEncodedDeck(encryptedBothKeysIndividually),
      });
    });
  }, [handleIfBob]));

  // deck/finalized
  useTexasHoldemEvent(texasHoldemEventEmitter, 'deck/finalized', useCallback((e: DeckFinalizedEvent) => {
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
        console.info(`[${aliceOrBob}] dealing cards [ ${cardOffsets[0]}, ${cardOffsets[1]} ] to the player (peerId = ${playerId}).`);
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
  }, [handleIfAlice, handleIfBob, players]));

  // card/decrypt
  useTexasHoldemEvent(texasHoldemEventEmitter, 'card/decrypt', useCallback((e: DecryptCardEvent) => {
    const dk = new DecryptionKey(BigInt(e.decryptionKey.d), BigInt(e.decryptionKey.n));
    switch (e.aliceOrBob) {
      case 'alice':
        setAliceDecryptionKey(dk, e.cardOffset);
        break;
      case 'bob':
        setBobDecryptionKey(dk, e.cardOffset);
        break;
    }
  }, [setAliceDecryptionKey, setBobDecryptionKey]));

  const smallBlind = useMemo(() => players ? players[0] : undefined, [players]);
  const bigBlind = useMemo(() => players ? players[1] : undefined, [players]);
  const button = useMemo(() => players ? players[players.length - 1] : undefined, [players]);

  const {
    bankrolls,
    totalBetsPerPlayer,
    potAmount,
    allInPlayers,
    foldedPlayers,
    calledPlayers,
    bet,
    fold,
    updateBankrollsAndResetBet,
  } = useBankrollsAndBet(100, boardStage, players); // TODO read 100 from settings

  const {
    whoseTurn,
    nextPlayersTurn,
    resetWhoseTurn,
  } = useWhoseTurn(allInPlayers, foldedPlayers, calledPlayers, boardStage, players);

  // action
  useTexasHoldemEvent(texasHoldemEventEmitter, 'action', useCallback((e: ActionEvent, whom: string) => {
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
  }, [fold, bet, nextPlayersTurn]));

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
        const revealAllHoleCards = (player: Player, aliceOrBob: 'alice' | 'bob') => {
          let cardOffset = 5;
          for (let i = 0; i < players.length; ++i) {
            const cardOffsets: [number, number] = [
              cardOffset++,
              cardOffset++,
            ];
            const dk = [
              player.getIndividualKey(cardOffsets[0]).decryptionKey,
              player.getIndividualKey(cardOffsets[1]).decryptionKey,
            ];
            console.info(`Revealing cards [ ${cardOffsets[0]}, ${cardOffsets[1]} ].`);
            firePublicEvent({
              type: 'card/decrypt',
              cardOffset: cardOffsets[0],
              aliceOrBob,
              decryptionKey: {
                d: dk[0].d.toString(),
                n: dk[0].n.toString(),
              },
            });
            firePublicEvent({
              type: 'card/decrypt',
              cardOffset: cardOffsets[1],
              aliceOrBob,
              decryptionKey: {
                d: dk[1].d.toString(),
                n: dk[1].n.toString(),
              },
            });
          }
        };
        handleIfAlice(alice => revealAllHoleCards(alice, 'alice'));
        handleIfBob(bob => revealAllHoleCards(bob, 'bob'));
        break;
    }
  }, [allInPlayers, calledPlayers, foldedPlayers, handleIfAlice, handleIfBob, players, boardStage, whoseTurn, isDealingCards, dealingCards]);

  const showdownResult = useShowdown(board, foldedPlayers, isDealingCards, deck, players, decryptionKeyPairs);

  const [showdownResultOfLastRound, setShowdownResultOfLastRound] = useState<ShowdownResult>();

  const [round, setRound] = useState(0);
  const nextRound = useCallback(() => setRound(prev => prev + 1), []);

  useEffect(() => {
    if (!showdownResult || totalBetsPerPlayer.size === 0 || whoseTurn) {
      return;
    }

    const pot = new Map(totalBetsPerPlayer);
    const amountsToBeUpdated = new Map<string, number>();
    for (let result of showdownResult) {
      const winners = result.players.sort((p1, p2) => (pot.get(p1) ?? 0) - (pot.get(p2) ?? 0));
      let amountUnallocated: number = 0;
      for (let winnerOffset = 0; winnerOffset < winners.length; ++winnerOffset) {
        let winner = winners[winnerOffset];
        const betPortion = pot.get(winner) ?? 0;

        for (let [p, betAmount] of Array.from(pot.entries())) {
          const wonAmount = Math.min(betPortion, betAmount);
          amountUnallocated += wonAmount;
          const remaining = betAmount - wonAmount;
          if (remaining === 0) {
            pot.delete(p);
          } else {
            pot.set(p, remaining);
          }
        }

        const wonPortion = Math.floor(amountUnallocated / (winners.length - winnerOffset));
        amountUnallocated -= wonPortion;
        console.log(`Player ${winner} won ${wonPortion}.`);
        amountsToBeUpdated.set(winner, (amountsToBeUpdated.get(winner) ?? 0) + wonPortion);
      }
    }
    // remaining
    for (let [p, remaining] of Array.from(pot.entries())) {
      amountsToBeUpdated.set(p, (amountsToBeUpdated.get(p) ?? 0) + remaining);
    }
    // remove zero amount
    for (let [p, amount] of Array.from(amountsToBeUpdated)) {
      if (amount === 0) {
        amountsToBeUpdated.delete(p);
      }
    }
    // reset everything of this round
    setPlayers(undefined);
    setDeck(undefined);
    resetDecryptionKeyPairs();
    resetMentalPokerParticipants();
    updateBankrollsAndResetBet(amountsToBeUpdated);
    resetWhoseTurn();
    setShowdownResultOfLastRound(showdownResult);
    nextRound();
  }, [updateBankrollsAndResetBet, resetDecryptionKeyPairs, resetMentalPokerParticipants, resetWhoseTurn, showdownResult, totalBetsPerPlayer, whoseTurn, nextRound]);

  const startGame = useCallback(() => {
    if (TexasHoldemGameRoom.members.length <= 1) {
      console.warn('Cannot start the game because there is only one player.');
      return;
    }

    setPlayers(curr => {
      const next = [
        ...TexasHoldemGameRoom.members.slice(round % TexasHoldemGameRoom.members.length),
        ...TexasHoldemGameRoom.members.slice(0, round % TexasHoldemGameRoom.members.length),
      ];
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
  }, [round]);

  const fireBet = useCallback((amount: number) => {
    firePublicEvent({
      type: 'action',
      action: 'bet',
      amount,
    });
  }, []);

  const fireFold = useCallback(() => {
    firePublicEvent({
      type: 'action',
      action: 'fold',
    });
  }, []);

  return {
    peerState: status,
    playerId: peerId,
    players,
    potAmount,
    hole,
    board,
    whoseTurn,
    smallBlind,
    bigBlind,
    button,
    startGame,
    bankrolls,
    totalBetsPerPlayer,
    showdownResultOfLastRound,
    actions: {
      fireBet,
      fireFold,
    },
  };
}
