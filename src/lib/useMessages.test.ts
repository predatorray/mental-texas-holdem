import {renderHook, waitFor} from "@testing-library/react";
import useMessages, {ChatRoomLike} from "./useMessages";
import EventEmitter from "eventemitter3";
import {ChatRoomEvents} from "./ChatRoom";

describe('useMessages', () => {
  test('messages are returned', async () => {
    const listener = new EventEmitter<ChatRoomEvents>();
    const mockChatRoom: ChatRoomLike = {
      listener,
    };
    const { result } = renderHook(() => useMessages(mockChatRoom));

    listener.emit('text', 'ABC', 'player1');
    listener.emit('text', 'XYZ', 'player2');

    await waitFor(() => {
      expect(result.current.length).toBe(2);
    });
    const messages = result.current;
    expect(messages[0].text).toBe('ABC');
    expect(messages[0].whose).toBe('player1');
    expect(messages[0].timestamp).toBeDefined();
    expect(messages[1].text).toBe('XYZ');
    expect(messages[1].whose).toBe('player2');
    expect(messages[1].timestamp).toBeDefined();
  });
});
