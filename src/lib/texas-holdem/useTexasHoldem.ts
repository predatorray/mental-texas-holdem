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

function useBoard() {
  const [board, setBoard] = useState<Board>([]);
  useEffect(() => {
    const boardListener = (round: number, board: Board) => {
      setBoard(board);
    }
    TexasHoldem.listener.on('board', boardListener);
    return () => {
      TexasHoldem.listener.off('board', boardListener);
    };
  }, []);

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

  const resetBoard = useCallback(() => setBoard([]), []);

  return {
    board,
    boardStage,
    resetBoard,
  };
}

function useHoles(myPlayerId: string | undefined) {
  const [holesPerPlayer, setHolesPerPlayer] = useState<Map<string, Hole>>(new Map());
  useEffect(() => {
    const holeListener = (round: number, whose: string, hole: Hole) => {
      setHolesPerPlayer(prev => {
        const newHolesPerPlayer = new Map<string, Hole>(prev);
        newHolesPerPlayer.set(whose, hole);
        return newHolesPerPlayer;
      });
    }
    TexasHoldem.listener.on('hole', holeListener);
    return () => {
      TexasHoldem.listener.off('hole', holeListener);
    };
  }, []);

  const myHole: Hole | undefined = useMemo(() => {
    if (!myPlayerId) {
      return undefined;
    }
    return holesPerPlayer.get(myPlayerId);
  }, [holesPerPlayer, myPlayerId]);

  const resetHole = useCallback(() => {
    setHolesPerPlayer(new Map());
  }, []);

  return {
    myHole,
    resetHole,
  }
}

function useWhoseTurn() {
  const [whoseTurn, setWhoseTurn] = useState<string | null>(null);
  useEffect(() => {
    const whoseTurnListener = (round: number, whoseTurn: string | null) => {
      setWhoseTurn(whoseTurn);
    };
    TexasHoldem.listener.on('whoseTurn', whoseTurnListener);
    return () => {
      TexasHoldem.listener.off('whoseTurn', whoseTurnListener);
    };
  }, []);

  const resetWhoseTurn = useCallback(() => {
    setWhoseTurn(null);
  }, []);

  return {
    whoseTurn,
    resetWhoseTurn,
  }
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

function useMyBetAmount(myPlayerId: string | undefined) {
  const [myBetAmount, setMyBetAmount] = useState<number>(0);

  useEffect(() => {
    const betListener = (round: number, amount: number, who: string) => {
      if (who === myPlayerId) {
        setMyBetAmount(prev => prev + amount);
      }
    };
    TexasHoldem.listener.on('bet', betListener);
    return () => {
      TexasHoldem.listener.off('bet', betListener);
    };
  }, [myPlayerId]);

  const resetMyBetAmount = useCallback(() => {
    setMyBetAmount(0);
  }, []);

  return {
    myBetAmount,
    resetMyBetAmount,
  };
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
    resetBoard,
  } = useBoard();

  const {
    myHole,
    resetHole,
  } = useHoles(myPlayerId);

  const {
    whoseTurn,
    resetWhoseTurn,
  } = useWhoseTurn();

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
  const {
    myBetAmount,
    resetMyBetAmount,
  } = useMyBetAmount(myPlayerId);

  const startNewRound = async () => {
    // cleanup
    resetBoard();
    resetHole();
    resetMyBetAmount();
    resetWhoseTurn();
    // TODO setShowdownResultOfLastRound if present
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
