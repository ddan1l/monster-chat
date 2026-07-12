import { chatService } from "../container.js";

import type { PeerInfoMessage, Peer } from "../types.js";

export function onPeerInfo(ws: Peer, data: PeerInfoMessage): void {
    const { chatId, peerSignPubKey, ...peerInfo } = data.payload;
    // Пересылаемый peerInfo — это личность отправителя, она должна совпадать
    // с аутентифицированным ключом.
    if (peerInfo.signPubKey !== ws.signPubKey) return;
    chatService.relayPeerInfo(chatId, peerInfo, peerSignPubKey);
}
