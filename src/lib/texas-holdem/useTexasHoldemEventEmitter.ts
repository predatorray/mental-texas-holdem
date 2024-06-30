import EventEmitter from "eventemitter3";
import { useMemo } from "react";
import { GameRoomEvents } from "../useGameRoom";
import { TexasHoldemEvent } from "./events";

type TexasHoldemEvents = {[K in TexasHoldemEvent['type']]: (e: ({type: K} & TexasHoldemEvent), fromWhom: string) => void};

export default function useTexasHoldemEventEmitter(gameEventEmitter: EventEmitter<GameRoomEvents<TexasHoldemEvent>>) {
  return useMemo(() => {
    const emitter = new EventEmitter<TexasHoldemEvents>();
    const eventHandler = (e: TexasHoldemEvent, fromWhom: string) => {
      emitter.emit(e.type, e as any, fromWhom);
    };

    gameEventEmitter.off('event');
    gameEventEmitter.on('event', (e, fromWhom) => {
      eventHandler(e, fromWhom);
    });
    return emitter;
  }, [gameEventEmitter]);
}
