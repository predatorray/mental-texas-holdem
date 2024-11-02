import EventEmitter from "eventemitter3";

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type EventListener<
  EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
  Context extends any = any
> = Omit<
  EventEmitter<EventTypes, Context>,
  'emit'
>;
