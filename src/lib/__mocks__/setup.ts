import EventEmitter from "eventemitter3";

const emitter = new EventEmitter();

const stubListener = {
  on: emitter.on.bind(emitter),
  off: emitter.off.bind(emitter),
  once: emitter.once.bind(emitter),
  // test-only: lets unit tests simulate incoming game events
  emit: emitter.emit.bind(emitter),
};

const stubGameRoom = {
  listener: stubListener,
  peerIdAsync: Promise.resolve('mock-peer-id'),
  emitEvent: () => Promise.resolve(),
  close: () => {},
};

export const HostId = undefined;

export const TexasHoldem = {
  listener: stubListener,
  gameRoom: stubGameRoom,
  peerIdAsync: new Promise<string>(() => {}), // pending: tests drive state via events
  members: [] as string[],
  startNewRound: () => Promise.resolve(),
  close: () => {},
};

export const Chat = {
  listener: stubListener,
  close: () => {},
};

export const setupReady = Promise.resolve({
  HostId,
  TexasHoldem,
  Chat,
});
