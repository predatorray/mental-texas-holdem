import EventEmitter from "eventemitter3";

const emitter = new EventEmitter();

const stubListener = {
  on: emitter.on.bind(emitter),
  off: emitter.off.bind(emitter),
  once: emitter.once.bind(emitter),
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
