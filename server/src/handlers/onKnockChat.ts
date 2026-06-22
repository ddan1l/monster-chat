import { chatService } from "../container.js";

import type { KnockChatMessage, Peer } from "../types.js";

export function onKnockChat(ws: Peer, data: KnockChatMessage): void {
    const { chatId, hostKey, peerInfo, timezone } = data.payload;
    chatService.knockChat(chatId, hostKey, peerInfo, ws, timezone);
}
