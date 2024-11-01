import { useCallback, useEffect, useMemo } from "react";
import { useMap, useSet } from "../utils";
import useBankrolls from "./useBankrolls";
import { BoardStage } from "./useBoard";

export default function useBankrollsAndBet(
  initialAmountPerPlayer: number,
  boardStage: BoardStage | null,
  players?: string[],
) {
  const {
    bankrolls,
    updateAmountOfPlayer,
    updateAmountsOfPlayers,
  } = useBankrolls(initialAmountPerPlayer, players);

  const [totalBetsPerPlayer, , updateTotalBetsPerPlayer, , resetTotalBetsPerPlayer] = useMap<string, number>();
  const anyOneHasBet: boolean = useMemo(() => {
    for (const bet of Array.from(totalBetsPerPlayer.values())) {
      if (bet > 0) {
        return true;
      }
    }
    return false;
  }, [totalBetsPerPlayer]);

  const leastTotalBetAmount = useMemo(() => {
    return Array.from(totalBetsPerPlayer.values()).reduce((a, b) => Math.max(a, b), 0);
  }, [totalBetsPerPlayer]);

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

    const currentBetAmount = totalBetsPerPlayer.get(player) ?? 0;
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
    updateTotalBetsPerPlayer(player, prevBet => {
      const newBet = prevBet ? prevBet + raisedAmount : raisedAmount;
      console.info(`Player ${player} raised the bet to ${newBet}.`);
      return newBet;
    });
    return true;
  }, [addCalledPlayer, bankrolls, totalBetsPerPlayer, clearCalledPlayers, leastTotalBetAmount, updateAmountOfPlayer, updateTotalBetsPerPlayer]);

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

  const [foldedPlayers, addFoldedPlayer, , clearFoldedPlayer] = useSet<string>();
  const fold = useCallback((player: string) => {
    console.info(`Player ${player} folded.`);
    addFoldedPlayer(player);
  }, [addFoldedPlayer]);

  useEffect(() => {
    clearCalledPlayers();
  }, [boardStage, clearCalledPlayers]);

  const potAmount = useMemo(() => {
    return Array.from(totalBetsPerPlayer.values()).reduce((a, b) => a + b, 0);
  }, [totalBetsPerPlayer]);

  const updateBankrollsAndResetBet = (amountsToBeUpdatedPerPlayer: Map<string, number>) => {
    resetTotalBetsPerPlayer();
    clearCalledPlayers();
    clearFoldedPlayer();
    updateAmountsOfPlayers(amountsToBeUpdatedPerPlayer);
  };

  return {
    bankrolls,
    totalBetsPerPlayer,
    potAmount,
    allInPlayers,
    foldedPlayers,
    calledPlayers,
    bet,
    fold,
    updateBankrollsAndResetBet,
  };
}
