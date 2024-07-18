export type StringEncodedDeck = string[];

export interface GameStartEvent {
  type: 'start';
  players: string[]; // [small blind, big blind, ..., button]
  mentalPokerSettings: {
    alice: string;
    bob: string;
  };
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

export type ActionEvent = {
  type: 'action';
} & ({
  action: 'fold';
} | {
  action: 'bet';
  amount: number;
});

export type TexasHoldemEvent =
  | GameStartEvent
  | DeckStep1Event
  | DeckStep2Event
  | DeckStep3Event
  | DeckFinalizedEvent
  | DecryptCardEvent
  | ActionEvent
;

export type TexasHoldemEvents = {[K in TexasHoldemEvent['type']]: (e: ({type: K} & TexasHoldemEvent), fromWhom: string) => void};
