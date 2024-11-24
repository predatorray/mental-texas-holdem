import MentalPokerGameRoom, {MentalPokerEvent} from "./MentalPokerGameRoom";
import GameRoom from "./GameRoom";
import Peer from "peerjs";
import {TexasHoldemGameRoom, TexasHoldemTableEvent} from "./texas-holdem/TexasHoldemGameRoom";
import ChatRoom, {ChatRoomEvent} from "./ChatRoom";

const peer = new Peer();

const gameRoom = new GameRoom<MentalPokerEvent | ChatRoomEvent | TexasHoldemTableEvent>(
  peer, {
    hostId: new URLSearchParams(window.location.search).get('gameRoomId') ?? undefined,
  }
);

export const HostId = gameRoom.hostId;

export const TexasHoldem = new TexasHoldemGameRoom(
  gameRoom,
  new MentalPokerGameRoom(gameRoom),
);

export const Chat = new ChatRoom(gameRoom);

window.addEventListener('beforeunload', () => {
  TexasHoldem.close();
  Chat.close();
  gameRoom.close();
  peer.disconnect();
  peer.destroy();
});
