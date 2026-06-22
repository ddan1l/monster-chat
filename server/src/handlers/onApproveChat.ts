import { chatService } from "../container.js";

import type { ApproveChatMessage, Peer } from "../types.js";

export function onApproveChat(ws: Peer, data: ApproveChatMessage): void {
    chatService.approveChat(data.payload.chatId, data.payload.peerInfo, ws);
}
