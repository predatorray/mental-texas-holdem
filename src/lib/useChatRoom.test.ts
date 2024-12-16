import useChatRoom, {ChatRoomLike} from "./useChatRoom";
import {renderHook, waitFor} from "@testing-library/react";
import EventEmitter from "eventemitter3";
import {ChatRoomEvents} from "./ChatRoom";

class MockChatRoom implements ChatRoomLike {
  listener = new EventEmitter<ChatRoomEvents>();
  nameSet: string | undefined;
  textMessages: string[] = [];

  async setMyName(name: string) {
    this.nameSet = name;
  }

  async sendTextMessage(text: string) {
    this.textMessages.push(text);
  }
}

describe('useChatRoom', () => {
  test('initial names and messages are empty', async () => {
    const mockChatRoom = new MockChatRoom();
    const { result } = renderHook(() => useChatRoom(mockChatRoom));
    const {
      names,
      messages,
    } = result.current;

    expect(names.size).toBe(0);
    expect(messages.length).toBe(0);
  });

  test('setMyName', async () => {
    const mockChatRoom = new MockChatRoom();
    const { result } = renderHook(() => useChatRoom(mockChatRoom));
    const {
      setMyName,
    } = result.current;

    setMyName('Alice');
    expect(mockChatRoom.nameSet).toBe('Alice');
  });

  test('sendMessage', async () => {
    const mockChatRoom = new MockChatRoom();
    const { result } = renderHook(() => useChatRoom(mockChatRoom));
    const {
      sendMessage,
    } = result.current;

    sendMessage('text1');
    sendMessage('text2');
    expect(mockChatRoom.textMessages).toEqual(['text1', 'text2']);
  });

  test('messages received from listener', async () => {
    const mockChatRoom = new MockChatRoom();
    const { result } = renderHook(() => useChatRoom(mockChatRoom));

    mockChatRoom.listener.emit('text', 'text1', 'p1');
    const messageReceived = await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
      return result.current.messages[0]
    });

    expect(messageReceived.type).toBe('message');
    expect(messageReceived.whose).toBe('p1');
    expect(messageReceived.text).toBe('text1');
    expect(messageReceived.timestamp).toBeDefined();
  });

  test('name received from listener', async () => {
    const mockChatRoom = new MockChatRoom();
    const { result } = renderHook(() => useChatRoom(mockChatRoom));

    mockChatRoom.listener.emit('name', 'Alice', 'p1');
    let namesUpdated = await waitFor(() => {
      expect(result.current.names.size).toBe(1);
      return result.current.names;
    });

    expect(namesUpdated.get('p1')).toBe('Alice');

    mockChatRoom.listener.emit('name', 'Bob', 'p1');
    await waitFor(() => {
      expect(result.current.names.get('p1')).toBe('Bob');
    });

    mockChatRoom.listener.emit('name', 'Carlie', 'p2');
    namesUpdated = await waitFor(() => {
      expect(result.current.names.size).toBe(2);
      return result.current.names;
    });
    expect(namesUpdated.get('p1')).toBe('Bob');
    expect(namesUpdated.get('p2')).toBe('Carlie');
  });
});
