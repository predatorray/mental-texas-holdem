import { EncodedDeck, decodeStandardCard } from "mental-poker-toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Board } from "../rules";
import DecryptionKeyPair from "./DecryptionKeyPair";

export type BoardStage =
  | 'Preflop'
  | 'Flop'
  | 'Turn'
  | 'River'
;

export default function useBoard(
  players?: string[],
  deck?: EncodedDeck,
  decryptionKeyPairs?: DecryptionKeyPair[],
) {
  const board: Board | null = useMemo(() => {
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
  
  const stage: BoardStage | null = useMemo(() => {
    if (!board) {
      return null;
    }
    switch (board.length) {
      case 0:
        return 'Preflop';
      case 3:
        return 'Flop';
      case 4:
        return 'Turn';
      case 5:
        return 'River';
    }
  }, [board]);

  const [isDealingCards, setDealingCards] = useState<boolean>(false);

  useEffect(() => {
    if (!stage || !decryptionKeyPairs || !isDealingCards) {
      return;
    }
    switch (stage) {
      case 'Flop':
        if (decryptionKeyPairs[0]?.alice && decryptionKeyPairs[0]?.bob
          && decryptionKeyPairs[1]?.alice && decryptionKeyPairs[1]?.bob
          && decryptionKeyPairs[2]?.alice && decryptionKeyPairs[2]?.bob
        ) {
          setDealingCards(false);
        }
        break;
      case 'Turn':
        if (decryptionKeyPairs[3]?.alice && decryptionKeyPairs[3]?.bob) {
          setDealingCards(false);
        }
        break;
      case 'River':
        if (decryptionKeyPairs[4]?.alice && decryptionKeyPairs[4]?.bob) {
          setDealingCards(false);
        }
        break;
    }
  }, [isDealingCards, decryptionKeyPairs, stage]);

  const dealingCards = useCallback(() => {
    setDealingCards(true);
  }, []);

  return {
    board,
    stage,
    isDealingCards,
    dealingCards,
  };
}
