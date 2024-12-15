import EventEmitter from "eventemitter3";

export type EventListener<
  EventTypes extends EventEmitter.ValidEventTypes = string | symbol,
  Context extends any = any
> = Omit<
  EventEmitter<EventTypes, Context>,
  'emit'
>;

export default interface DataTestIdAttributes {
  'data-testid'?: string;
}
