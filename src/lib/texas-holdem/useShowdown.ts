import {useMemo} from "react";
import {evaluateCards, rankCards} from "phe";
import {Board, CARDS} from "../rules";
import {decodeStandardCard, EncodedDeck, StandardCard} from "mental-poker-toolkit";
import DecryptionKeyPair from "./DecryptionKeyPair";

export type ShowdownResult = Array<{
  strength: number;
  handValue: number;
  players: string[];
}>;

export default function useShowdown(
  board: Board | null,
  foldedPlayers: Set<string>,
  isDealingCards: boolean,
  deck?: EncodedDeck,
  players?: string[],
  decryptionKeyPairs?: DecryptionKeyPair[],
): ShowdownResult | null {
  const holesShownPerPlayer = useMemo(() => {
    if (!deck || !players || !decryptionKeyPairs || decryptionKeyPairs.length < CARDS || isDealingCards) {
      return null;
    }
    const holesOfEachPlayer = new Map<string, StandardCard[]>();
    for (let playerOffset = 0; playerOffset < players.length; ++playerOffset) {
      const player = players[playerOffset];
      if (foldedPlayers.has(player)) {
        continue;
      }
      const holeOffsets = [
        playerOffset * 2 + 5,
        playerOffset * 2 + 6,
      ];
      const dk = [
        decryptionKeyPairs[holeOffsets[0]],
        decryptionKeyPairs[holeOffsets[1]],
      ];
      if (!dk[0].alice || !dk[0].bob || !dk[1].alice || !dk[1].bob) {
        return null;
      }

      const hole = [
        decodeStandardCard(Number(dk[0].alice.decrypt(dk[0].bob.decrypt(deck.cards[holeOffsets[0]])))),
        decodeStandardCard(Number(dk[1].alice.decrypt(dk[1].bob.decrypt(deck.cards[holeOffsets[1]])))),
      ];
      holesOfEachPlayer.set(player, hole);
    }
    return holesOfEachPlayer;
  }, [deck, players, decryptionKeyPairs, foldedPlayers]);

  return useMemo(() => {
    if (!holesShownPerPlayer || !board || board.length !== 5) {
      return null;
    }
    const strengthOfPlayers: Array<{
      player: string;
      handValue: number;
      strength: number;
    }> = [];
    for (let [player, hole] of Array.from(holesShownPerPlayer.entries())) {
      const holeAndBoard = [...hole, ...board];
      const cards = holeAndBoard.map(card => card.rank + card.suit.charAt(0).toLowerCase());
      const handValue = rankCards(cards);
      const strength = evaluateCards(cards);
      strengthOfPlayers.push({
        player,
        handValue,
        strength,
      });
    }

    const result: ShowdownResult = [];
    for (const s of strengthOfPlayers.sort((s1, s2) => s1.strength - s2.strength)) {
      const last = result.length > 0 ? result[result.length - 1] : null;
      if (last && last.strength === s.strength) {
        last.players.push(s.player);
      } else {
        result.push({
          players: [s.player],
          handValue: s.handValue,
          strength: s.strength,
        });
      }
    }

    return result;
  }, [board, holesShownPerPlayer]);
}
