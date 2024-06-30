import { EncodedDeck, decodeStandardCard } from "mental-poker-toolkit";
import { useMemo } from "react";
import { Board } from "../rules";
import DecryptionKeyPair from "./DecryptionKeyPair";

export default function useBoard(
  players?: string[],
  deck?: EncodedDeck,
  decryptionKeyPairs?: DecryptionKeyPair[],
): Board | null {
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
