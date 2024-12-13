import {useEffect, useState} from "react";
import {Chat} from "./setup";

export interface Message {
  type: 'message';
  text: string;
  whose: string;
  timestamp: number;
}

export type Messages = Message[];

export default function useChatRoom() {
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
    Chat.listener.on('text', textListener);
    return () => {
      Chat.listener.off('text', textListener);
    }
  }, []);

  const [names, setNames] = useState(new Map<string, string>());

  useEffect(() => {
    const nameListener = (name: string, whose: string) => {
      setNames(prev => {
        const next = new Map(prev);
        next.set(whose, name);
        return next;
      });
    };
    Chat.listener.on('name', nameListener);
    return () => {
      Chat.listener.off('name', nameListener);
    }
  }, []);

  const setMyName = (name: string) => {
    Chat.setMyName(name);
  };

  const sendMessage = (text: string) => {
    Chat.sendTextMessage(text);
  };

  return {
    names,
    messages,
    setMyName,
    sendMessage,
  };
}
