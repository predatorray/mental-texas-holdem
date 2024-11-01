import GameRoom from "../GameRoom";
import {TexasHoldemEvent} from "./events";
import Peer from "peerjs";

const urlParams = new URLSearchParams(window.location.search);
const hostId = urlParams.get('gameRoomId') ?? undefined;
const TexasHoldemGameRoom = new GameRoom<TexasHoldemEvent>(new Peer(), { hostId });

export default TexasHoldemGameRoom;
