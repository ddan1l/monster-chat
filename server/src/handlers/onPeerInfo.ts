import { chatService } from "../container.js";

import type { PeerInfoMessage, Peer } from "../types.js";

export function onPeerInfo(ws: Peer, data: PeerInfoMessage): void {
    const { chatId, peerSignPubKey, ...peerInfo } = data.payload;
    chatService.relayPeerInfo(chatId, ws, peerInfo, peerSignPubKey);
}
