import { useCallback, useEffect, useState } from "react";

export default function useBankrolls(initialAmount: number, players?: string[]) {
  const [bankrolls, setBankrolls] = useState<Map<string, number>>(new Map());

  // initialize bankroll if a player joins the first time.
  // even if a player leaves, the bankroll will still be there.
  useEffect(() => {
    if (!players) {
      return;
    }
    setBankrolls(prev => {
      let updated = false;
      const next = new Map(prev);
      for (const player of players) {
        if (!prev.has(player)) {
          next.set(player, initialAmount);
          updated = true;
        }
      }
      return updated ? next : prev;
    })
  }, [initialAmount, players]);

  const updateAmountOfPlayer = useCallback((player: string, amountAdded: number) => {
    setBankrolls(prev => {
      const newBankrolls = new Map(prev);
      const bankroll = newBankrolls.get(player);
      if (!bankroll) {
        newBankrolls.set(player, amountAdded);
      } else {
        newBankrolls.set(player, bankroll + amountAdded);
      }
      return newBankrolls;
    })
  }, [setBankrolls]);

  return {
    bankrolls,
    updateAmountOfPlayer,
  };
}
