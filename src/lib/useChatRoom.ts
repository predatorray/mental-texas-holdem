import {useEffect, useState} from "react";
import {Chat} from "./setup";

export interface Message {
  text: string;
  whose: string;
}

export default function useChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const textListener = (text: string, whose: string) => {
      setMessages(prev => [
        ...prev,
        {
          text,
          whose,
        },
      ]);
    };
    Chat.listener.on('text', textListener);
    return () => {
      Chat.listener.off('text', textListener);
    }
  }, []);

  return messages;
}
