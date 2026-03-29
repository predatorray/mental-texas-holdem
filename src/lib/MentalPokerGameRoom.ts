import {GameEvent, GameRoomEvents, GameRoomStatus} from "./GameRoom";
import {
  createPlayer,
  decodeStandardCard,
  DecryptionKey,
  EncodedDeck,
  encodeStandardCard,
  getStandard52Deck,
  Player,
  PublicKey,
  StandardCard
} from "mental-poker-toolkit";
import {CARDS} from "./rules";
import Deferred from "./Deferred";
import {EventListener} from "./types";
import EventEmitter from "eventemitter3";
import LifecycleManager from "./LifecycleManager";

export interface MentalPokerRoundSettings {
  alice: string;
  bob: string;
  bits?: number;
}

export interface RoundStartEvent {
  type: 'start';
  round: number;
  mentalPokerSettings: MentalPokerRoundSettings;
}

export type StringEncodedDeck = string[];

export interface DeckStep1Event {
  type: 'deck/step1';
  round: number;
  deck: StringEncodedDeck;
  publicKey: {
    p: string;
    q: string;
  };
}

export interface DeckStep2Event {
  type: 'deck/step2';
  round: number;
  deck: StringEncodedDeck;
}

export interface DeckStep3Event {
  type: 'deck/step3';
  round: number;
  deck: StringEncodedDeck;
}

export interface DeckFinalizedEvent {
  type: 'deck/finalized';
  round: number;
  deck: StringEncodedDeck;
}

export interface DecryptCardEvent {
  type: 'card/decrypt';
  round: number;
  cardOffset: number;
  aliceOrBob: 'alice' | 'bob';
  decryptionKey: { d: string; n: string };
}

export type MentalPokerEvent =
  | RoundStartEvent
  | DeckStep1Event
  | DeckStep2Event
  | DeckStep3Event
  | DeckFinalizedEvent
  | DecryptCardEvent
;

function toStringEncodedDeck(deck: EncodedDeck): StringEncodedDeck {
  return deck.cards.map(i => i.toString());
}

function toBigIntEncodedDeck(deck: StringEncodedDeck): EncodedDeck {
  return new EncodedDeck(deck.map(s => BigInt(s)));
}

const SESSION_INDIVIDUAL_KEYS = 'mental-holdem:individualKeys';

function storeIndividualKeys(round: number, aliceOrBob: 'alice' | 'bob', player: Player, cards: number) {
  const keys: Record<number, { d: string; n: string }> = {};
  for (let i = 0; i < cards; i++) {
    const dk = player.getIndividualKey(i).decryptionKey;
    keys[i] = { d: dk.d.toString(), n: dk.n.toString() };
  }
  sessionStorage.setItem(`${SESSION_INDIVIDUAL_KEYS}:${round}:${aliceOrBob}`, JSON.stringify(keys));
}

function loadIndividualKeys(round: number, aliceOrBob: 'alice' | 'bob'): Map<number, DecryptionKey> {
  const result = new Map<number, DecryptionKey>();
  const stored = sessionStorage.getItem(`${SESSION_INDIVIDUAL_KEYS}:${round}:${aliceOrBob}`);
  if (stored) {
    const keys: Record<string, { d: string; n: string }> = JSON.parse(stored);
    for (const [offset, key] of Object.entries(keys)) {
      result.set(Number(offset), new DecryptionKey(BigInt(key.d), BigInt(key.n)));
    }
  }
  return result;
}

class MentalPokerRound {
  mentalPokerSettings: Deferred<MentalPokerRoundSettings> = new Deferred();
  alice: Deferred<Player | null> = new Deferred();
  bob: Deferred<Player | null> = new Deferred();
  sharedPublicKey: Deferred<PublicKey> = new Deferred();
  deck: Deferred<EncodedDeck> = new Deferred();
  decryptionKeys: Array<{
    alice: Deferred<DecryptionKey>;
    bob: Deferred<DecryptionKey>;
  }> = new Array(CARDS).fill({}).map(() => {
    return {
      alice: new Deferred<DecryptionKey>(),
      bob: new Deferred<DecryptionKey>(),
    }
  });
  // Individual decryption keys stored for use after page refresh (when Player is null)
  aliceIndividualKeys: Map<number, DecryptionKey> = new Map();
  bobIndividualKeys: Map<number, DecryptionKey> = new Map();
}

export interface MentalPokerGameRoomEvents {
  connected: (peerId: string) => void;
  status: (status: GameRoomStatus) => void;
  members: (members: string[]) => void;

  shuffled: () => void;
  card: (round: number, offset: number, card: StandardCard) => void;
}

export interface GameRoomLike<T> {
  listener: EventListener<GameRoomEvents<GameEvent<T>>>;
  peerIdAsync: Promise<string>;
  emitEvent: (e: GameEvent<T>) => Promise<void>;
  members: string[];
  close: () => void;
}

export default class MentalPokerGameRoom {
  private readonly emitter = new EventEmitter<MentalPokerGameRoomEvents>();
  private readonly gameRoom: GameRoomLike<MentalPokerEvent>;
  private round: number = 0;

  private dataByRounds: Map<number, MentalPokerRound> = new Map();

  private readonly lcm = new LifecycleManager();

  constructor(gameRoom: GameRoomLike<MentalPokerEvent | any>) {
    this.gameRoom = gameRoom;

    this.propagate('status');
    this.propagate('connected');
    this.propagate('members');

    this.gameRoom.listener.on('event', this.lcm.register(({ data }, _who, replay) => {
      switch (data.type) {
        case 'start':
          this.handleRoundStartEvent(data, !!replay);
          break;
        case 'deck/step1':
          this.handleDeckStep1Event(data, !!replay);
          break;
        case 'deck/step2':
          this.handleDeckStep2Event(data, !!replay);
          break;
        case 'deck/step3':
          this.handleDeckStep3Event(data, !!replay);
          break;
        case 'deck/finalized':
          this.handleDeckFinalizedEvent(data);
          break;
        case 'card/decrypt':
          this.handleCardDecrypted(data);
          break;
      }
    }, listener => this.gameRoom.listener.off('event', listener)));
  }

  async startNewRound(settings: MentalPokerRoundSettings) {
    this.dataByRounds.delete(this.round);

    const newRound = ++this.round;
    this.getOrCreateDataForRound(newRound);

    await this.firePublicEvent({
      type: 'start',
      round: newRound,
      mentalPokerSettings: settings,
    });

    return newRound;
  }

  get members() {
    return this.gameRoom.members;
  }

  private getOrCreateDataForRound(round: number): MentalPokerRound {
    if (this.round < round) {
      this.round = round;
    }
    const existing = this.dataByRounds.get(round);
    if (existing) {
      return existing;
    }

    const newRoundData = new MentalPokerRound();

    // bind events
    newRoundData.decryptionKeys.forEach((decryptionKey, offset) => {
      Promise.all([
        decryptionKey.alice.promise,
        decryptionKey.bob.promise,
        newRoundData.deck.promise,
      ]).then(async ([
                       alice,
                       bob,
                       deck,
                     ]) => {
        const decryptedByAlice = alice.decrypt(deck.cards[offset]);
        const doubleDecrypted = bob.decrypt(decryptedByAlice);
        const card = decodeStandardCard(Number(doubleDecrypted));
        console.log(`The card [${offset}] has been decrypted: ${card.suit} ${card.rank}`);
        this.emitter.emit('card', round, offset, card);
      });
    });
    newRoundData.deck.promise.then(() => {
      this.emitter.emit('shuffled');
    });

    this.dataByRounds.set(round, newRoundData);
    return newRoundData;
  }

  private async getDecryptionKeyForCard(
    roundData: MentalPokerRound,
    cardOffset: number,
    aliceOrBob: 'alice' | 'bob',
  ): Promise<{ d: string; n: string } | null> {
    const player = await (aliceOrBob === 'alice' ? roundData.alice : roundData.bob).promise;
    if (player) {
      const dk = player.getIndividualKey(cardOffset).decryptionKey;
      return { d: dk.d.toString(), n: dk.n.toString() };
    }

    // Fall back to stored individual keys (after page refresh when Player is null)
    const storedKeys = aliceOrBob === 'alice'
      ? roundData.aliceIndividualKeys
      : roundData.bobIndividualKeys;
    const dk = storedKeys.get(cardOffset);
    return dk ? { d: dk.d.toString(), n: dk.n.toString() } : null;
  }

  async showCard(round: number, cardOffset: number) {
    const roundData = this.dataByRounds.get(round);
    if (!roundData) {
      console.warn(`There is no round ${round}.`);
      return;
    }

    for (const aliceOrBob of ['alice', 'bob'] as const) {
      const dk = await this.getDecryptionKeyForCard(roundData, cardOffset, aliceOrBob);
      if (dk) {
        console.debug(`[${aliceOrBob}] showing the card [ ${cardOffset} ] to all the players.`);
        await this.firePublicEvent({
          type: 'card/decrypt',
          round,
          cardOffset,
          aliceOrBob,
          decryptionKey: dk,
        });
      }
    }
  }

  async dealCard(round: number, cardOffset: number, recipient: string) {
    const roundData = this.dataByRounds.get(round);
    if (!roundData) {
      console.warn(`There is no round ${round}.`);
      return;
    }

    for (const aliceOrBob of ['alice', 'bob'] as const) {
      const dk = await this.getDecryptionKeyForCard(roundData, cardOffset, aliceOrBob);
      if (dk) {
        console.debug(`Dealing the card [ ${cardOffset} ] to ${recipient}.`);
        await this.firePrivateEvent({
          type: 'card/decrypt',
          round,
          cardOffset,
          aliceOrBob,
          decryptionKey: dk,
        }, recipient);
      }
    }
  }

  get listener(): EventListener<MentalPokerGameRoomEvents> {
    return this.emitter;
  }

  close() {
    this.gameRoom.close();
    this.lcm.close();
  }

  private propagate(eventName: (keyof (GameRoomEvents<MentalPokerEvent> | MentalPokerGameRoomEvents))) {
    this.gameRoom.listener.on(eventName, this.lcm.register((...args) => {
      this.emitter.emit(eventName, ...args);
    }, listener => this.gameRoom.listener.off(eventName, listener)));
  }

  private async handleRoundStartEvent(e: RoundStartEvent, replay: boolean) {
    const settings = e.mentalPokerSettings;

    const roundData = this.getOrCreateDataForRound(e.round);
    roundData.mentalPokerSettings.resolve(settings);

    if (replay) {
      // During replay, skip Player creation and outgoing events.
      // The deck steps and card/decrypt events are already in the log
      // and will be replayed, resolving decryption keys directly.
      // Load stored individual keys so showCard/dealCard can work post-replay.
      roundData.alice.resolve(null);
      roundData.bob.resolve(null);
      roundData.aliceIndividualKeys = loadIndividualKeys(e.round, 'alice');
      roundData.bobIndividualKeys = loadIndividualKeys(e.round, 'bob');
      return;
    }

    const myPeerId = await this.gameRoom.peerIdAsync;
    if (settings.alice === myPeerId) {
      console.debug('Creating Alice');
      const alicePromise = createPlayer({
        cards: CARDS,
        bits: settings.bits ?? 32,
      });
      roundData.alice.resolve(alicePromise);

      const alice = await alicePromise;
      storeIndividualKeys(e.round, 'alice', alice, CARDS);

      console.debug('Encrypting and shuffling the deck by Alice.');

      const standard52Deck = getStandard52Deck();
      const deckEncoded = new EncodedDeck(
        standard52Deck.map((card) => BigInt(encodeStandardCard(card)))
      );
      const deckEncrypted = alice.encryptAndShuffle(deckEncoded);
      await this.firePublicEvent({
        type: 'deck/step1',
        round: e.round,
        deck: toStringEncodedDeck(deckEncrypted),
        publicKey: {
          p: alice.publicKey.p.toString(),
          q: alice.publicKey.q.toString(),
        }
      });
    } else {
      roundData.alice.resolve(null);
    }

    if (settings.bob !== myPeerId) {
      roundData.bob.resolve(null);
    }
  }

  private async handleDeckStep1Event(e: DeckStep1Event, replay: boolean) {
    if (replay) return;
    const roundData = this.getOrCreateDataForRound(e.round);
    const settings = await roundData.mentalPokerSettings.promise;
    const myPeerId = await this.gameRoom.peerIdAsync;

    if (settings.bob === myPeerId) {
      const sharedPublicKey = new PublicKey(BigInt(e.publicKey.p), BigInt(e.publicKey.q));
      roundData.sharedPublicKey.resolve(sharedPublicKey);

      console.debug('Creating Bob');
      const bobPromise = createPlayer({
        cards: CARDS,
        publicKey: sharedPublicKey,
        bits: settings.bits ?? 32,
      });

      roundData.bob.resolve(bobPromise);

      const bob = await bobPromise;
      storeIndividualKeys(e.round, 'bob', bob, CARDS);

      console.debug('Double-encrypting and shuffling the deck by Bob.');
      const encryptedWithKeyAKeyB = bob.encryptAndShuffle(toBigIntEncodedDeck(e.deck));

      await this.firePublicEvent({
        type: 'deck/step2',
        round: e.round,
        deck: toStringEncodedDeck(encryptedWithKeyAKeyB),
      });
    }
  }

  private async handleDeckStep2Event(e: DeckStep2Event, replay: boolean) {
    if (replay) return;
    const roundData = this.getOrCreateDataForRound(e.round);
    const alice = await roundData.alice.promise;

    if (alice) {
      console.debug('Decrypting and encrypting individually by Alice.');
      const encryptedWithIndividualKeyAKeyB = alice.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
      await this.firePublicEvent({
        type: 'deck/step3',
        round: e.round,
        deck: toStringEncodedDeck(encryptedWithIndividualKeyAKeyB),
      });
    }
  }

  private async handleDeckStep3Event(e: DeckStep3Event, replay: boolean) {
    if (replay) return;
    const roundData = this.getOrCreateDataForRound(e.round);
    const bob = await roundData.bob.promise;

    if (bob) {
      console.debug('Decrypting and encrypting individually by Bob. (Deck shuffling is finalized)');
      const encryptedBothKeysIndividually = bob.decryptAndEncryptIndividually(toBigIntEncodedDeck(e.deck));
      await this.firePublicEvent({
        type: 'deck/finalized',
        round: e.round,
        deck: toStringEncodedDeck(encryptedBothKeysIndividually),
      });
    }
  }

  private async handleDeckFinalizedEvent(e: DeckFinalizedEvent) {
    const roundData = this.getOrCreateDataForRound(e.round);
    roundData.deck.resolve(toBigIntEncodedDeck(e.deck));
  }

  private async handleCardDecrypted(e: DecryptCardEvent) {
    const roundData = this.getOrCreateDataForRound(e.round);
    const dk = new DecryptionKey(BigInt(e.decryptionKey.d), BigInt(e.decryptionKey.n));
    switch (e.aliceOrBob) {
      case 'alice':
        roundData.decryptionKeys[e.cardOffset].alice.resolve(dk);
        break;
      case 'bob':
        roundData.decryptionKeys[e.cardOffset].bob.resolve(dk);
        break;
    }
  }

  private async firePublicEvent(e: MentalPokerEvent) {
    await this.gameRoom.emitEvent({
      type: 'public',
      sender: await this.gameRoom.peerIdAsync,
      data: e,
    });
  }

  private async firePrivateEvent(e: MentalPokerEvent, recipient: string) {
    await this.gameRoom.emitEvent({
      type: 'private',
      sender: await this.gameRoom.peerIdAsync,
      recipient,
      data: e,
    });
  }
}
