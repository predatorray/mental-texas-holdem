import {renderHook, waitFor} from "@testing-library/react";
import EventEmitter from "eventemitter3";
import {ChatRoomEvents} from "./ChatRoom";
import useNames, {ChatRoomLike} from "./useNames";

describe('useNames', () => {
  test('names are updated', async () => {
    const listener = new EventEmitter<ChatRoomEvents>();
    const mockChatRoom: ChatRoomLike = {
      listener,
    };
    const { result } = renderHook(() => useNames(mockChatRoom));

    listener.emit('name', 'Alice', 'player1')
    listener.emit('name', 'Bob', 'player2');

    await waitFor(() => {
      expect(result.current.size).toBe(2);
    });

    const names = result.current;
    expect(names.get('player1')).toBe('Alice');
    expect(names.get('player2')).toBe('Bob');
  });
});
