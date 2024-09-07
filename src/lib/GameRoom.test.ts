import EventEmitter from "eventemitter3";
import { PeerConnectOption } from "peerjs";
import GameRoom, { DataConnectionLike, DataConnectionLikeEvents, GameEvent, MembersChangedEvent, PeerLike, PeerLikeEvents } from "./GameRoom";

class MockDataConnection extends EventEmitter<DataConnectionLikeEvents> implements DataConnectionLike {
  peer: string;
  dataSent: any[] = [];

  private paired?: MockDataConnection;

  constructor(peer: string) {
    super();
    this.peer = peer;
  }

  send(data: any, chunked?: boolean): void | Promise<void> {
    this.dataSent.push(data);
    this.paired?.emit('data', data);
  }

  pair(paired: MockDataConnection) {
    this.paired = paired;
    paired.paired = this;
  }

  close(): void {
  }

  get lastDataSent() {
    if (this.dataSent.length <= 0) {
      throw new Error('no data was sent');
    }
    return this.dataSent[this.dataSent.length - 1];
  }
}
  
class MockPeer extends EventEmitter<PeerLikeEvents> implements PeerLike {
  connections: MockDataConnection[] = [];
  connect(peer: string, options?: PeerConnectOption): DataConnectionLike {
    const newConn = new MockDataConnection(peer);
    this.connections.push(newConn);
    return newConn;
  }

  get lastConnection() {
    if (this.connections.length <= 0) {
      throw new Error('No connection was established.');
    }
    return this.connections[this.connections.length - 1];
  }
}

describe('MockDataConnections', () => {
  test('pairing two MockDataConnections', async () => {
    const a = new MockDataConnection('a');
    const b = new MockDataConnection('b');
    a.pair(b);
  
    const dataReceivedByA = new Promise(resolve => {
      a.on('data', data => {
        resolve(data);
      });
    });
  
    const dataReceivedByB = new Promise(resolve => {
      b.on('data', data => {
        resolve(data);
      });
    });
  
    a.send('test1');
    expect(await dataReceivedByB).toBe('test1');
  
    b.send('test2');
    expect(await dataReceivedByA).toBe('test2');
  });
});

describe('GameRoom', () => {
  test('status transition of a host GameRoom', async () => {
    const mockPeer = new MockPeer();
    const hostGameRoom = new GameRoom(mockPeer);
    expect(hostGameRoom.status).toBe('NotReady');

    mockPeer.emit('open', 'test');
    expect(hostGameRoom.status).toBe('PeerServerConnected');
    
    mockPeer.emit('close');
    expect(hostGameRoom.status).toBe('Closed');
  });

  test('status transition of a guest GameRoom', async () => {
    const hostId = 'dummy';
    const mockPeer = new MockPeer();
    const hostGameRoom = new GameRoom(mockPeer, {
      hostId,
    });
    expect(hostGameRoom.status).toBe('NotReady');

    mockPeer.emit('open', 'test');
    expect(hostGameRoom.status).toBe('PeerServerConnected');
    
    mockPeer.lastConnection.emit('open');
    expect(hostGameRoom.status).toBe('HostConnected');

    mockPeer.emit('close');
    expect(hostGameRoom.status).toBe('Closed');
  });

  test("host's members are updated", async () => {
    const mockPeer = new MockPeer();
    const hostGameRoom = new GameRoom(mockPeer);
    const hostId = 'host';
    mockPeer.emit('open', hostId);

    expect(hostGameRoom.members.length).toBe(1);
    expect(hostGameRoom.members[0]).toBe(hostId);

    const guestIds = ['guest0', 'guest1'];
    const guestConns = [
      new MockDataConnection(guestIds[0]),
      new MockDataConnection(guestIds[1]),
    ];
    mockPeer.emit('connection', guestConns[0]);
    expect(hostGameRoom.members.length).toBe(2);
    expect(hostGameRoom.members[1]).toBe(guestIds[0]);

    mockPeer.emit('connection', guestConns[1]);
    expect(hostGameRoom.members.length).toBe(3);
    expect(hostGameRoom.members[2]).toBe(guestIds[1]);

    guestConns[0].emit('open');
    guestConns[0].emit('close');
    expect(hostGameRoom.members).toEqual([hostId, guestIds[1]]);
  });

  test("guest's members are updated", async () => {
    const hostId = 'host';
    const mockPeer = new MockPeer();
    const guestGameRoom = new GameRoom(mockPeer, {
      hostId,
    });
    const guestId = 'guest';
    mockPeer.emit('open', guestId);
    expect(guestGameRoom.members.length).toBe(0);

    mockPeer.lastConnection.emit('open');
    const memberChangedEvent: MembersChangedEvent = {
      type: '_members',
      data: [hostId, guestId],
    };
    mockPeer.lastConnection.emit('data', memberChangedEvent);
    expect(guestGameRoom.members).toEqual([hostId, guestId]);
  });

  test('data is sent by guest', async () => {
    const hostId = 'host';
    const mockGuestPeer = new MockPeer();
    const guestGameRoom = new GameRoom<string>(mockGuestPeer, {
      hostId,
    });
    const guestId = 'guest';
    mockGuestPeer.emit('open', guestId);

    mockGuestPeer.lastConnection.emit('open');
    await guestGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: guestId,
    });
    const lastDataSent = mockGuestPeer.lastConnection.lastDataSent;
    expect(lastDataSent.data).toBe('test');
  });

  const DEFAULT_HOST_ID = 'host';

  function openHost(
    hostId: string = DEFAULT_HOST_ID,
  ) {
    const mockHostPeer = new MockPeer();
    const hostGameRoom = new GameRoom<string>(mockHostPeer);
    mockHostPeer.emit('open', hostId);

    return {
      hostGameRoom,
      mockHostPeer,
    };
  }

  function openGuest(
    guestId: string,
    hostId: string = DEFAULT_HOST_ID,
  ) {
    const mockGuestPeer = new MockPeer();
    const guestGameRoom = new GameRoom<string>(mockGuestPeer, {
      hostId,
    });
    mockGuestPeer.emit('open', guestId);
    return {
      guestGameRoom,
      mockGuestPeer,
    };
  }

  function connectGuestToHost(
    guestId: string,
    mockGuestPeer: MockPeer,
    mockHostPeer: MockPeer,
  ) {
    const mockGuestConn = mockGuestPeer.lastConnection;

    const mockHostConn = new MockDataConnection(guestId);
    mockGuestConn.pair(mockHostConn);

    mockHostPeer.emit('connection', mockHostConn);

    mockHostConn.emit('open');
    mockGuestConn.emit('open');

    return {
      mockGuestConn,
      mockHostConn,
    };
  }

  test('send data from guest to host', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestId = 'guest';
    const {mockGuestPeer, guestGameRoom} = openGuest(guestId);
    const {mockGuestConn} = connectGuestToHost(guestId, mockGuestPeer, mockHostPeer);

    const hostGameRoomEventPromise = new Promise<GameEvent<string>>(resolve =>
      hostGameRoom.onEvent(e => {
        resolve(e);
      })
    );

    await guestGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: guestId,
    });
    expect(mockGuestConn.lastDataSent.data).toBe('test');

    const hostGameRoomEvent = await hostGameRoomEventPromise;
    expect(hostGameRoomEvent.data).toBe('test');
    expect(hostGameRoomEvent.type).toBe('public');
    expect(hostGameRoomEvent.sender).toBe(guestId);
  });

  test('send data from host to guest', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestId = 'guest';
    const {mockGuestPeer, guestGameRoom} = openGuest(guestId);
    const {mockHostConn} = connectGuestToHost(guestId, mockGuestPeer, mockHostPeer);

    const guestGameRoomEventPromise = new Promise<GameEvent<string>>(resolve =>
      guestGameRoom.onEvent(e => {
        resolve(e);
      })
    );

    await hostGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: guestId,
    });
    expect(mockHostConn.lastDataSent.data).toBe('test');

    const guestGameRoomEvent = await guestGameRoomEventPromise;
    expect(guestGameRoomEvent.data).toBe('test');
    expect(guestGameRoomEvent.type).toBe('public');
    expect(guestGameRoomEvent.sender).toBe(guestId);
  });

  test('broadcast data from one guest to others thru host', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestIds = ['guest0', 'guest1'];
    const guests = [
      openGuest(guestIds[0]),
      openGuest(guestIds[1]),
    ];
    const connections = [
      connectGuestToHost(guestIds[0], guests[0].mockGuestPeer, mockHostPeer),
      connectGuestToHost(guestIds[1], guests[1].mockGuestPeer, mockHostPeer),
    ]

    const eventPromises = [
      new Promise<GameEvent<string>>(resolve => hostGameRoom.onEvent(e => {resolve(e);})),
      new Promise<GameEvent<string>>(resolve => guests[0].guestGameRoom.onEvent(e => {resolve(e);})),
      new Promise<GameEvent<string>>(resolve => guests[1].guestGameRoom.onEvent(e => {resolve(e);})),
    ];

    await guests[0].guestGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: guestIds[0],
    });
    expect(connections[0].mockGuestConn.lastDataSent.data).toBe('test');

    for (const guestGameRoomEventPromise of eventPromises) {
      const guest1GameRoomEvent = await guestGameRoomEventPromise;
      expect(guest1GameRoomEvent.data).toBe('test');
      expect(guest1GameRoomEvent.type).toBe('public');
      expect(guest1GameRoomEvent.sender).toBe(guestIds[0]);
    }
  });

  test('broadcast data from host to all guests', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestIds = ['guest0', 'guest1'];
    const guests = [
      openGuest(guestIds[0]),
      openGuest(guestIds[1]),
    ];
    connectGuestToHost(guestIds[0], guests[0].mockGuestPeer, mockHostPeer);
    connectGuestToHost(guestIds[1], guests[1].mockGuestPeer, mockHostPeer);

    const eventPromises = [
      new Promise<GameEvent<string>>(resolve => hostGameRoom.onEvent(e => {resolve(e);})),
      new Promise<GameEvent<string>>(resolve => guests[0].guestGameRoom.onEvent(e => {resolve(e);})),
      new Promise<GameEvent<string>>(resolve => guests[1].guestGameRoom.onEvent(e => {resolve(e);})),
    ];

    await hostGameRoom.emitEvent({
      type: 'public',
      data: 'test',
      sender: guestIds[0],
    });

    for (const guestGameRoomEventPromise of eventPromises) {
      const guest1GameRoomEvent = await guestGameRoomEventPromise;
      expect(guest1GameRoomEvent.data).toBe('test');
      expect(guest1GameRoomEvent.type).toBe('public');
      expect(guest1GameRoomEvent.sender).toBe(guestIds[0]);
    }
  });

  test('send private data from one guest to another thru host', async () => {
    const {mockHostPeer} = openHost();
    const guestIds = ['guest0', 'guest1'];
    const guests = [
      openGuest(guestIds[0]),
      openGuest(guestIds[1]),
    ];
    connectGuestToHost(guestIds[0], guests[0].mockGuestPeer, mockHostPeer);
    connectGuestToHost(guestIds[1], guests[1].mockGuestPeer, mockHostPeer);

    const recipientEventPromise = new Promise<GameEvent<string>>(resolve => guests[1].guestGameRoom.onEvent(e => {resolve(e);}));

    await guests[0].guestGameRoom.emitEvent({
      type: 'private',
      data: 'test',
      sender: guestIds[0],
      recipient: guestIds[1],
    });

    const guest1GameRoomEvent = await recipientEventPromise;
    expect(guest1GameRoomEvent.data).toBe('test');
    expect(guest1GameRoomEvent.type).toBe('private');
    expect(guest1GameRoomEvent.sender).toBe(guestIds[0]);
  }, 30000);

  test('send private data from one guest to host', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestIds = ['guest0', 'guest1'];
    const guests = [
      openGuest(guestIds[0]),
      openGuest(guestIds[1]),
    ];
    connectGuestToHost(guestIds[0], guests[0].mockGuestPeer, mockHostPeer);
    connectGuestToHost(guestIds[1], guests[1].mockGuestPeer, mockHostPeer);

    const recipientEventPromise = new Promise<GameEvent<string>>(resolve => hostGameRoom.onEvent(e => {resolve(e);}));

    await guests[0].guestGameRoom.emitEvent({
      type: 'private',
      data: 'test',
      sender: guestIds[0],
      recipient: DEFAULT_HOST_ID,
    });

    const guest1GameRoomEvent = await recipientEventPromise;
    expect(guest1GameRoomEvent.data).toBe('test');
    expect(guest1GameRoomEvent.type).toBe('private');
    expect(guest1GameRoomEvent.sender).toBe(guestIds[0]);
  }, 30000);

  test('send private data from host to a guest', async () => {
    const {mockHostPeer, hostGameRoom} = openHost();
    const guestIds = ['guest0', 'guest1'];
    const guests = [
      openGuest(guestIds[0]),
      openGuest(guestIds[1]),
    ];
    connectGuestToHost(guestIds[0], guests[0].mockGuestPeer, mockHostPeer);
    connectGuestToHost(guestIds[1], guests[1].mockGuestPeer, mockHostPeer);

    const recipientEventPromise = new Promise<GameEvent<string>>(resolve => guests[0].guestGameRoom.onEvent(e => {resolve(e);}));

    await hostGameRoom.emitEvent({
      type: 'private',
      data: 'test',
      sender: DEFAULT_HOST_ID,
      recipient: guestIds[0],
    });

    const guest1GameRoomEvent = await recipientEventPromise;
    expect(guest1GameRoomEvent.data).toBe('test');
    expect(guest1GameRoomEvent.type).toBe('private');
    expect(guest1GameRoomEvent.sender).toBe(DEFAULT_HOST_ID);
  }, 30000);
});
