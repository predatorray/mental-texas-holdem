import { EncodedDeck, decodeStandardCard } from "mental-poker-toolkit";
import DecryptionKeyPair from "./DecryptionKeyPair";
import { Hole } from "../rules";
import { useMemo } from "react";

export default function useHole(
  players?: string[] | undefined,
  deck?: EncodedDeck | undefined,
  decryptionKeyPairs?: DecryptionKeyPair[] | undefined,
  playerId?: string,
): Hole | null {
  return useMemo(() => {
    if (!players || !deck || !decryptionKeyPairs) {
      return null;
    }
    const playerOffset = players.findIndex(v => v === playerId);
    if (playerOffset < 0) {
      throw new Error('Cannot find player');
    }
    const holeOffsets = [
      playerOffset * 2 + 5,
      playerOffset * 2 + 6,
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
