import GameRoom, { GameEvent, MeshLike } from "./GameRoom";

type Listeners<T> = {
  ready: Array<(localPeerId: string) => void>;
  message: Array<(message: any, replay: boolean) => void>;
  peersChanged: Array<(peers: string[]) => void>;
  leaderChanged: Array<(leaderId: string | null) => void>;
  error: Array<(error: Error) => void>;
};

class MockMesh<T> implements MeshLike<T> {
  private _peerId: string | undefined;
  private _peers: string[] = [];
  private _leaderId: string | null = null;
  private listeners: Listeners<T> = {
    ready: [],
    message: [],
    peersChanged: [],
    leaderChanged: [],
    error: [],
  };

  publicSent: T[] = [];
  privateSent: Array<{ recipient: string; data: T }> = [];
  closed: boolean = false;

  private paired: MockMesh<T>[] = [];

  get peerId() { return this._peerId; }
  get peers() { return this._peers; }
  get leaderId() { return this._leaderId; }

  async sendPublic(data: T): Promise<boolean> {
    this.publicSent.push(data);
    // Simulate Raft commit: deliver to self and all paired meshes
    const msg = { type: 'public' as const, sender: this._peerId!, data };
    this.emit('message', msg, false);
    for (const peer of this.paired) {
      peer.emit('message', msg, false);
    }
    return true;
  }

  async sendPrivate(recipientPeerId: string, data: T): Promise<boolean> {
    this.privateSent.push({ recipient: recipientPeerId, data });
    // Simulate Raft commit + decryption: deliver to sender and recipient only
    const msg = { type: 'private' as const, sender: this._peerId!, recipient: recipientPeerId, data };
    this.emit('message', msg, false);
    for (const peer of this.paired) {
      if (peer._peerId === recipientPeerId) {
        peer.emit('message', msg, false);
      }
    }
    return true;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    const list = this.listeners[event as keyof Listeners<T>];
    if (list) {
      list.push(listener);
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const list = this.listeners[event as keyof Listeners<T>];
    if (list) {
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  close(): void {
    this.closed = true;
  }

  // Test helpers

  emit(event: string, ...args: any[]) {
    const list = this.listeners[event as keyof Listeners<T>];
    if (list) {
      for (const listener of [...list]) {
        (listener as Function)(...args);
      }
    }
  }

  simulateOpen(peerId: string) {
    this._peerId = peerId;
    this._peers = [peerId];
    this.emit('ready', peerId);
    // Simulate Raft leader election (single-node becomes leader immediately)
    this._leaderId = peerId;
    this.emit('leaderChanged', peerId);
  }

  simulatePeerConnected(remotePeerId: string) {
    if (!this._peers.includes(remotePeerId)) {
      this._peers.push(remotePeerId);
    }
    this.emit('peersChanged', [...this._peers]);
  }

  simulatePeerDisconnected(remotePeerId: string) {
    this._peers = this._peers.filter(p => p !== remotePeerId);
    this.emit('peersChanged', [...this._peers]);
  }

  pair(other: MockMesh<T>) {
    if (!this.paired.includes(other)) {
      this.paired.push(other);
    }
    if (!other.paired.includes(this)) {
      other.paired.push(this);
    }
  }
}

describe('GameRoom', () => {
  test('status transition of a host GameRoom', async () => {
    const mesh = new MockMesh<string>();
    const gameRoom = new GameRoom(mesh);
    expect(gameRoom.status).toBe('NotReady');

    mesh.simulateOpen('host');
    expect(gameRoom.status).toBe('PeerServerConnected');

    gameRoom.close();
    expect(gameRoom.status).toBe('Closed');
    expect(mesh.closed).toBe(true);
  });

  test('status transition of a guest GameRoom', async () => {
    const mesh = new MockMesh<string>();
    const gameRoom = new GameRoom(mesh, { hostId: 'host' });
    expect(gameRoom.status).toBe('NotReady');

    mesh.simulateOpen('guest');
    expect(gameRoom.status).toBe('PeerServerConnected');

    mesh.simulatePeerConnected('host');
    expect(gameRoom.status).toBe('HostConnected');

    gameRoom.close();
    expect(gameRoom.status).toBe('Closed');
  });

  test("host's members are updated", async () => {
    const mesh = new MockMesh<string>();
    const gameRoom = new GameRoom(mesh);
    mesh.simulateOpen('host');

    expect(gameRoom.members).toEqual(['host']);

    mesh.simulatePeerConnected('guest0');
    expect(gameRoom.members).toEqual(['host', 'guest0']);

    mesh.simulatePeerConnected('guest1');
    expect(gameRoom.members).toEqual(['host', 'guest0', 'guest1']);

    mesh.simulatePeerDisconnected('guest0');
    expect(gameRoom.members).toEqual(['host', 'guest1']);
  });

  test("guest's members are updated", async () => {
    const mesh = new MockMesh<string>();
    const gameRoom = new GameRoom(mesh, { hostId: 'host' });
    mesh.simulateOpen('guest');
    expect(gameRoom.members).toEqual(['guest']);

    mesh.simulatePeerConnected('host');
    expect(gameRoom.members).toEqual(['guest', 'host']);
  });

  test('send public event from guest', async () => {
    const mesh = new MockMesh<string>();
    const gameRoom = new GameRoom<string>(mesh, { hostId: 'host' });
    mesh.simulateOpen('guest');
    mesh.simulatePeerConnected('host');

    await gameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: 'guest',
    });
    expect(mesh.publicSent).toEqual(['test']);
  });

  function createMeshPair() {
    const hostMesh = new MockMesh<string>();
    const guestMesh = new MockMesh<string>();
    hostMesh.pair(guestMesh);
    return { hostMesh, guestMesh };
  }

  test('send public data from guest to host', async () => {
    const { hostMesh, guestMesh } = createMeshPair();
    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guestGameRoom = new GameRoom<string>(guestMesh, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    guestMesh.simulateOpen('guest');
    hostMesh.simulatePeerConnected('guest');
    guestMesh.simulatePeerConnected('host');

    const hostEventPromise = new Promise<GameEvent<string>>(resolve =>
      hostGameRoom.onEvent(e => resolve(e))
    );

    await guestGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: 'guest',
    });

    const hostEvent = await hostEventPromise;
    expect(hostEvent.data).toBe('test');
    expect(hostEvent.type).toBe('public');
    expect(hostEvent.sender).toBe('guest');
  });

  test('send public data from host to guest', async () => {
    const { hostMesh, guestMesh } = createMeshPair();
    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guestGameRoom = new GameRoom<string>(guestMesh, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    guestMesh.simulateOpen('guest');
    hostMesh.simulatePeerConnected('guest');
    guestMesh.simulatePeerConnected('host');

    const guestEventPromise = new Promise<GameEvent<string>>(resolve =>
      guestGameRoom.onEvent(e => resolve(e))
    );

    await hostGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: 'host',
    });

    const guestEvent = await guestEventPromise;
    expect(guestEvent.data).toBe('test');
    expect(guestEvent.type).toBe('public');
    expect(guestEvent.sender).toBe('host');
  });

  test('broadcast data from one guest to others thru mesh', async () => {
    const mesh0 = new MockMesh<string>();
    const mesh1 = new MockMesh<string>();
    const hostMesh = new MockMesh<string>();
    mesh0.pair(mesh1);
    mesh0.pair(hostMesh);
    mesh1.pair(hostMesh);

    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guest0GameRoom = new GameRoom<string>(mesh0, { hostId: 'host' });
    const guest1GameRoom = new GameRoom<string>(mesh1, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    mesh0.simulateOpen('guest0');
    mesh1.simulateOpen('guest1');

    const eventPromises = [
      new Promise<GameEvent<string>>(resolve => hostGameRoom.onEvent(e => resolve(e))),
      new Promise<GameEvent<string>>(resolve => guest0GameRoom.onEvent(e => resolve(e))),
      new Promise<GameEvent<string>>(resolve => guest1GameRoom.onEvent(e => resolve(e))),
    ];

    await guest0GameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: 'guest0',
    });

    for (const promise of eventPromises) {
      const event = await promise;
      expect(event.data).toBe('test');
      expect(event.type).toBe('public');
      expect(event.sender).toBe('guest0');
    }
  });

  test('send private data from one guest to another', async () => {
    const mesh0 = new MockMesh<string>();
    const mesh1 = new MockMesh<string>();
    mesh0.pair(mesh1);

    const guest0GameRoom = new GameRoom<string>(mesh0, { hostId: 'host' });
    const guest1GameRoom = new GameRoom<string>(mesh1, { hostId: 'host' });

    mesh0.simulateOpen('guest0');
    mesh1.simulateOpen('guest1');

    const recipientEventPromise = new Promise<GameEvent<string>>(resolve =>
      guest1GameRoom.onEvent(e => resolve(e))
    );

    await guest0GameRoom.emitEvent({
      type: 'private',
      data: 'secret',
      sender: 'guest0',
      recipient: 'guest1',
    });

    const event = await recipientEventPromise;
    expect(event.data).toBe('secret');
    expect(event.type).toBe('private');
    expect(event.sender).toBe('guest0');
  });

  test('send private data from guest to host', async () => {
    const { hostMesh, guestMesh } = createMeshPair();
    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guestGameRoom = new GameRoom<string>(guestMesh, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    guestMesh.simulateOpen('guest');

    const hostEventPromise = new Promise<GameEvent<string>>(resolve =>
      hostGameRoom.onEvent(e => resolve(e))
    );

    await guestGameRoom.emitEvent({
      type: 'private',
      data: 'secret',
      sender: 'guest',
      recipient: 'host',
    });

    const event = await hostEventPromise;
    expect(event.data).toBe('secret');
    expect(event.type).toBe('private');
    expect(event.sender).toBe('guest');
  });

  test('send private data from host to guest', async () => {
    const { hostMesh, guestMesh } = createMeshPair();
    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guestGameRoom = new GameRoom<string>(guestMesh, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    guestMesh.simulateOpen('guest');

    const guestEventPromise = new Promise<GameEvent<string>>(resolve =>
      guestGameRoom.onEvent(e => resolve(e))
    );

    await hostGameRoom.emitEvent({
      type: 'private',
      data: 'secret',
      sender: 'host',
      recipient: 'guest',
    });

    const event = await guestEventPromise;
    expect(event.data).toBe('secret');
    expect(event.type).toBe('private');
    expect(event.sender).toBe('host');
  });

  test('resources are released after closed', async () => {
    const { hostMesh, guestMesh } = createMeshPair();
    const hostGameRoom = new GameRoom<string>(hostMesh);
    const guestGameRoom = new GameRoom<string>(guestMesh, { hostId: 'host' });

    hostMesh.simulateOpen('host');
    guestMesh.simulateOpen('guest');

    guestGameRoom.close();
    hostGameRoom.close();

    expect(guestMesh.closed).toBe(true);
    expect(hostMesh.closed).toBe(true);
  });
});
