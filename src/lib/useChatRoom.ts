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

  const sendMessage = (text: string) => {
    Chat.sendTextMessage(text);
  };

  return {
    messages,
    sendMessage,
  };
}
