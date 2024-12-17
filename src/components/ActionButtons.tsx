import React, {useCallback} from "react";
import ActionButton from "./ActionButton";

export default function ActionButtons(props: {
  potAmount: number;
  bankroll: number;
  callAmount: number;
  fireBet: (amount: number) => void;
  fireFold: () => void;
}) {
  const {
    fireBet,
    fireFold,
    bankroll,
    potAmount,
    callAmount,
  } = props;

  const checkOrCall = useCallback(() => {
    fireBet(callAmount);
  }, [fireBet, callAmount]);
  const raiseUpToHalfPot =  useCallback(() => {
    fireBet(Math.ceil(potAmount / 2));
  }, [fireBet, potAmount]);
  const raiseUpToPot =  useCallback(() => {
    fireBet(potAmount);
  }, [fireBet, potAmount]);
  const raiseUpToTwicePot =  useCallback(() => {
    fireBet(potAmount * 2);
  }, [fireBet, potAmount]);
  const allIn =  useCallback(() => {
    fireBet(bankroll);
  }, [fireBet, bankroll]);

  const fold = useCallback(() => {
    fireFold();
  }, [fireFold]);
  return (
    <div className="actions">
      <ActionButton className="action-check-or-call" onClick={checkOrCall} data-testid="check-or-call-action-button">
        {
          callAmount === 0 ? 'CHECK' : <>CALL<br/>${callAmount}</>
        }
      </ActionButton>
      {
        callAmount <= Math.ceil(potAmount / 2) && <ActionButton className="action-raise" onClick={raiseUpToHalfPot} data-testid="raise-half-pot-action-button">RAISE<br/>1/2 pot</ActionButton>
      }
      {
        callAmount <= potAmount && <ActionButton className="action-raise" onClick={raiseUpToPot} data-testid="raise-1-pot-action-button">RAISE<br/>1 pot</ActionButton>
      }
      {
        callAmount <= (potAmount * 2) &&  <ActionButton className="action-raise" onClick={raiseUpToTwicePot} data-testid="raise-twice-pot-action-button">RAISE<br/>2 pot</ActionButton>
      }
      <ActionButton className="action-all-in" onClick={allIn} data-testid="all-in-action-button">ALL-IN</ActionButton>
      {
        callAmount > 0 && <ActionButton className="action-fold" onClick={fold} data-testid="fold-action-button">FOLD</ActionButton>
      }
    </div>
  );
}