import {useEffect, useState} from "react";
import {Chat} from "./setup";
import {EventListener} from "./types";
import {ChatRoomEvents} from "./ChatRoom";

export interface Message {
  type: 'message';
  text: string;
  whose: string;
  timestamp: number;
}

export type Messages = Message[];

export interface ChatRoomLike {
  listener: EventListener<ChatRoomEvents>;
}

export default function useMessages(
  chatRoom: ChatRoomLike = Chat,
) {
  const [messages, setMessages] = useState<Messages>([]);

  useEffect(() => {
    const textListener = (text: string, whose: string) => {
      setMessages(prev => [
        ...prev,
        {
          type: 'message',
          text,
          whose,
          timestamp: Date.now(),
        },
      ]);
    };
    chatRoom.listener.on('text', textListener);
    return () => {
      chatRoom.listener.off('text', textListener);
    }
  }, [chatRoom.listener]);

  return messages;
}
