import {useEffect, useState} from "react";
import {Chat} from "./setup";
import {ChatRoomEvents} from "./ChatRoom";
import {EventListener} from "./types";

export interface Message {
  type: 'message';
  text: string;
  whose: string;
  timestamp: number;
}

export type Messages = Message[];

export interface ChatRoomLike {
  listener: EventListener<ChatRoomEvents>;
  setMyName(name: string): Promise<any>;
  sendTextMessage(text: string): Promise<any>;
}

export default function useChatRoom(
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

  const [names, setNames] = useState(new Map<string, string>());

  useEffect(() => {
    const nameListener = (name: string, whose: string) => {
      setNames(prev => {
        const next = new Map(prev);
        next.set(whose, name);
        return next;
      });
    };
    chatRoom.listener.on('name', nameListener);
    return () => {
      chatRoom.listener.off('name', nameListener);
    }
  }, [chatRoom.listener]);

  const setMyName = (name: string) => {
    chatRoom.setMyName(name);
  };

  const sendMessage = (text: string) => {
    chatRoom.sendTextMessage(text);
  };

  return {
    names,
    messages,
    setMyName,
    sendMessage,
  };
}
