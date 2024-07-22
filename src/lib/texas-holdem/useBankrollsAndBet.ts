import { useCallback, useEffect, useMemo } from "react";
import { useMap, useSet } from "../utils";
import useBankrolls from "./useBankrolls";
import { BoardStage } from "./useBoard";

export default function useBankrollsAndBet(
  initialAmountPerPlayer: number,
  boardStage: BoardStage | null,
  players?: string[],
) {
  // const [bankrolls, , updateBankroll, , , setBankrolls] = useMap<string, number>();
  const {
    bankrolls,
    updateAmountOfPlayer,
  } = useBankrolls(initialAmountPerPlayer, players);

  const [betsPerPlayer, , updateBetsPerPlayer] = useMap<string, number>();
  const anyOneHasBet: boolean = useMemo(() => {
    for (const [, bet] of Array.from(betsPerPlayer.entries())) {
      if (bet > 0) {
        return true;
      }
    }
    return false;
  }, [betsPerPlayer]);

  const leastTotalBetAmount = useMemo(() => {
    return Array.from(betsPerPlayer.entries()).map(([, betAmount]) => betAmount).reduce((a, b) => Math.max(a, b), 0);
  }, [betsPerPlayer]);

  const [calledPlayers, addCalledPlayer, , clearCalledPlayers] = useSet<string>();

  const bet = useCallback((player: string, raisedAmount: number) => {
    if (raisedAmount < 0) {
      return false;
    }

    const currentBankroll = bankrolls.get(player)!;
    if (currentBankroll < raisedAmount) {
      console.warn(`Bankroll is not sufficient.`);
      return false;
    }

    const currentBetAmount = betsPerPlayer.get(player) ?? 0;
    if (currentBetAmount + raisedAmount < leastTotalBetAmount && currentBankroll !== raisedAmount) { // if less but not all-in
      console.warn(`Cannot bet ${raisedAmount} addition to ${currentBetAmount} because the least bet amount is ${leastTotalBetAmount}.`);
      return false;
    }
    if (currentBetAmount + raisedAmount === leastTotalBetAmount) {
      // call or check
      addCalledPlayer(player);
    } else {
      // raise
      clearCalledPlayers();
      addCalledPlayer(player);
    }

    updateAmountOfPlayer(player, -raisedAmount);
    updateBetsPerPlayer(player, prevBet => {
      const newBet = prevBet ? prevBet + raisedAmount : raisedAmount;
      console.info(`Player ${player} raised the bet to ${newBet}.`);
      return newBet;
    });
    return true;
  }, [addCalledPlayer, bankrolls, betsPerPlayer, clearCalledPlayers, leastTotalBetAmount, updateAmountOfPlayer, updateBetsPerPlayer]);

  useEffect(() => {
    if (!players || anyOneHasBet) {
      return;
    }
    
    // sb bets 0.5 & bb bets 1
    const sb = players[0];
    bet(sb, 0.5);
    const bb = players[1];
    bet(bb, 1);
  }, [players, anyOneHasBet, bet]);

  const allInPlayers: Set<string> = useMemo(() => {
    if (!players) {
      return new Set<string>();
    }
    const res = new Set<string>();
    for (const player of players) {
      const bankroll = bankrolls.get(player);
      if (bankroll !== undefined && bankroll <= 0) {
        res.add(player);
      }
    }
    return res;
  }, [bankrolls, players]);

  const [foldedPlayers, addFoldedPlayer] = useSet<string>();
  const fold = useCallback((player: string) => {
    console.info(`Player ${player} folded.`);
    addFoldedPlayer(player);
  }, [addFoldedPlayer]);

  useEffect(() => {
    clearCalledPlayers();
  }, [boardStage]);

  const smallBlind = useMemo(() => players ? players[0] : undefined, [players]);
  const bigBlind = useMemo(() => players ? players[1] : undefined, [players]);
  const button = useMemo(() => players ? players[players.length - 1] : undefined, [players]);

  return {
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
  };
}
