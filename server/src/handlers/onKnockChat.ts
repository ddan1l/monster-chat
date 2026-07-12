import { chatService } from "../container.js";

import type { KnockChatMessage, Peer } from "../types.js";

export function onKnockChat(ws: Peer, data: KnockChatMessage): void {
    const { chatId, hostKey, peerInfo, timezone } = data.payload;
    // Стучащийся не может подставить чужой ключ как свой.
    if (peerInfo.signPubKey !== ws.signPubKey) return;
    chatService.knockChat(chatId, hostKey, peerInfo, ws, timezone);
}
