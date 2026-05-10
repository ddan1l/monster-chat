import type { KnockChatMessage, Peer } from "../types.js";
import { chatService } from "../container.js";

export function onKnockChat(ws: Peer, data: KnockChatMessage): void {
    const { chatId, hostKey, peerInfo } = data.payload;
    chatService.knockChat(chatId, hostKey, peerInfo, ws);
}
