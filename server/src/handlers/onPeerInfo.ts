import type { PeerInfoMessage, Peer } from "../types.js";
import { chatService } from "../container.js";

export function onPeerInfo(ws: Peer, data: PeerInfoMessage): void {
    const { chatId, ...peerInfo } = data.payload;
    chatService.relayPeerInfo(chatId, ws, peerInfo);
}
