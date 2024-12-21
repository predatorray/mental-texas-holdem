import {useEffect, useState} from "react";
import {Chat} from "./setup";
import {ChatRoomEvents} from "./ChatRoom";
import {EventListener} from "./types";

export interface ChatRoomLike {
  listener: EventListener<ChatRoomEvents>;
}

export default function useNames(
  chatRoom: ChatRoomLike = Chat,
) {
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

  return names;
}
