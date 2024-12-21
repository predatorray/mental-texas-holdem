import {Chat} from "./setup";
import {ChatRoomEvents} from "./ChatRoom";
import {EventListener} from "./types";
import useNames from "./useNames";
import useMessages from "./useMessages";

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
  const messages = useMessages(chatRoom);
  const names = useNames(chatRoom);

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
