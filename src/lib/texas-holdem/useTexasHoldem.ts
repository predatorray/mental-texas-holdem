import {useCallback, useEffect, useMemo, useState} from "react";
import {GameRoomStatus} from "../GameRoom";
import {TexasHoldem} from "../setup";
import {Board, Hole} from "../rules";
import {WinningResult} from "./TexasHoldemGameRoom";

function useMyPlayerId() {
  const [peerId, setPeerId] = useState<string>();
  useEffect(() => {
    const peerIdListener = (peerIdAssigned: string) => setPeerId(peerIdAssigned);
    TexasHoldem.listener.on('connected', peerIdListener);
    return () => {
      TexasHoldem.listener.off('connected', peerIdListener);
    }
  }, []);
  return peerId;
}

function useStatus() {
  const [status, setStatus] = useState<GameRoomStatus>('NotReady');
  useEffect(() => {
    const statusListener = (statusChanged: GameRoomStatus) => setStatus(statusChanged);
    TexasHoldem.listener.on('status', statusListener);
    return () => {
      TexasHoldem.listener.off('status', statusListener);
    }
  }, []);
  return status;
}

function useGameSetup() {
  const [currentRound, setCurrentRound] = useState<number>();
  const [players, setPlayers] = useState<string[]>();

  useEffect(() => {
    const newRoundListener = (round: number, players: string[]) => {
      setCurrentRound(round);
      setPlayers(players);
    };
    TexasHoldem.listener.on('players', newRoundListener);
    return () => {
      TexasHoldem.listener.off('players', newRoundListener);
    };
  }, []);

  useEffect(() => {
    const winnerListener = (result: WinningResult) => {
      if (currentRound === result.round) {
        setPlayers(undefined);
      }
    };
    TexasHoldem.listener.on('winner', winnerListener);
    return () => {
      TexasHoldem.listener.off('winner', winnerListener);
    };
  }, [currentRound]);

  const smallBlind = useMemo(() => players ? players[0] : undefined, [players]);
  const bigBlind = useMemo(() => players ? players[1] : undefined, [players]);
  const button = useMemo(() => players ? players[players.length - 1] : undefined, [players]);

  return {
    players,
    smallBlind,
    bigBlind,
    button,
    currentRound,
  };
}

function useBankrolls() {
  const [bankrolls, setBankrolls] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const fundListener = (fund: number, whose: string) => {
      setBankrolls(prev => {
        const newBankrolls = new Map(prev);
        newBankrolls.set(whose, fund);
        return newBankrolls;
      });
    };
    TexasHoldem.listener.on('fund', fundListener);
    return () => {
      TexasHoldem.listener.off('fund', fundListener);
    };
  }, []);

  return bankrolls;
}

export type BoardStage =
  | 'Preflop'
  | 'Flop'
  | 'Turn'
  | 'River'
  ;

function useBoard(round: number | undefined) {
  const [boardPerRound, setBoardPerRound] = useState<Map<number, Board>>(new Map());
  useEffect(() => {
    const boardListener = (round: number, board: Board) => {
      setBoardPerRound(prev => {
        const next = new Map(prev);
        next.set(round, board);
        return next;
      });
    }
    TexasHoldem.listener.on('board', boardListener);
    return () => {
      TexasHoldem.listener.off('board', boardListener);
    };
  }, []);

  const board = useMemo(() => round ? (boardPerRound.get(round) ?? []) : [], [boardPerRound, round]);

  const boardStage: BoardStage | undefined = useMemo(() => {
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

  return {
    board,
    boardStage,
  };
}

function useHoles(round: number | undefined, myPlayerId: string | undefined) {
  const [holesPerPlayerPerRound, setHolesPerPlayerPerRound] = useState<Map<number, Map<string, Hole>>>(new Map());
  useEffect(() => {
    const holeListener = (round: number, whose: string, hole: Hole) => {
      setHolesPerPlayerPerRound(prev => {
        const next = new Map(prev);
        const holesPerPlayer: Map<string, Hole> = next.get(round) ?? new Map();
        holesPerPlayer.set(whose, hole);
        next.set(round, holesPerPlayer);
        return next;
      });
    }
    TexasHoldem.listener.on('hole', holeListener);
    return () => {
      TexasHoldem.listener.off('hole', holeListener);
    };
  }, []);

  const holesPerPlayer = useMemo(() =>
      round ? holesPerPlayerPerRound.get(round) : undefined,
    [holesPerPlayerPerRound, round]);

  const myHole: Hole | undefined = useMemo(() => {
    if (!myPlayerId || !holesPerPlayer) {
      return undefined;
    }
    return holesPerPlayer.get(myPlayerId);
  }, [holesPerPlayer, myPlayerId]);

  return {
    myHole,
  }
}

function useWhoseTurn(round: number | undefined) {
  const [whoseTurnPerRound, setWhoseTurnPerRound] = useState<Map<number, string | null>>(new Map());
  useEffect(() => {
    const whoseTurnListener = (round: number, whoseTurn: string | null) => {
      setWhoseTurnPerRound(prev => {
        const next = new Map(prev);
        next.set(round, whoseTurn);
        return next;
      });
    };
    TexasHoldem.listener.on('whoseTurn', whoseTurnListener);
    return () => {
      TexasHoldem.listener.off('whoseTurn', whoseTurnListener);
    };
  }, []);

  return useMemo(() => round ? whoseTurnPerRound.get(round) ?? null : null, [round, whoseTurnPerRound])
}

function usePotAmount() {
  const [potAmount, setPotAmount] = useState<number>(0);
  useEffect(() => {
    const potListener = (round: number, amount: number) => {
      setPotAmount(amount);
    };
    TexasHoldem.listener.on('pot', potListener);
    return () => {
      TexasHoldem.listener.off('pot', potListener);
    };
  }, []);

  return potAmount;
}

function useMyBetAmount(round: number | undefined, myPlayerId: string | undefined) {
  const [myBetAmountPerRound, setMyBetAmountPerRound] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const betListener = (round: number, amount: number, who: string) => {
      if (who === myPlayerId) {
        setMyBetAmountPerRound(prev => {
          const next = new Map(prev);
          next.set(round, (next.get(round) ?? 0) + amount);
          return next;
        })
      }
    };
    TexasHoldem.listener.on('bet', betListener);
    return () => {
      TexasHoldem.listener.off('bet', betListener);
    };
  }, [myPlayerId]);

  return useMemo(() => round ? myBetAmountPerRound.get(round) : undefined, [myBetAmountPerRound, round]);
}

function useShowdownAndWinner() {
  const [lastWinningResult, setLastWinningResult] = useState<WinningResult>();
  useEffect(() => {
    const winnerListener = (result: WinningResult) => {
      setLastWinningResult(result);
    };
    TexasHoldem.listener.on('winner', winnerListener);
    return () => {
      TexasHoldem.listener.off('winner', winnerListener);
    };
  }, []);
  return lastWinningResult;
}

export default function useTexasHoldem() {
  const myPlayerId = useMyPlayerId();
  const status = useStatus();
  const {
    players,
    smallBlind,
    bigBlind,
    button,
    currentRound,
  } = useGameSetup();

  const bankrolls = useBankrolls();

  const {
    board,
  } = useBoard(currentRound);

  const {
    myHole,
  } = useHoles(currentRound, myPlayerId);

  const whoseTurn = useWhoseTurn(currentRound);

  const fireBet = useCallback(async (amount: number) => {
    if (!currentRound) {
      return;
    }
    await TexasHoldem.bet(currentRound, amount);
  }, [currentRound]);

  const fireFold = useCallback(async () => {
    if (!currentRound) {
      return;
    }
    await TexasHoldem.fold(currentRound);
  }, [currentRound]);

  const potAmount = usePotAmount();
  const myBetAmount = useMyBetAmount(currentRound, myPlayerId);

  const startNewRound = async () => {
    await TexasHoldem.startNewRound({
      initialFundAmount: 100, // TODO read from config
    });
  };

  const lastWinningResult = useShowdownAndWinner();

  return {
    peerState: status,
    playerId: myPlayerId,
    players,
    potAmount,
    hole: myHole,
    board,
    whoseTurn,
    smallBlind,
    bigBlind,
    button,
    startGame: startNewRound,
    bankrolls,
    myBetAmount,
    lastWinningResult,
    actions: {
      fireBet,
      fireFold,
    },
  };
}
