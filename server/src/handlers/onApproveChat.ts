import { chatService } from "../container.js";

import type { ApproveChatMessage, Peer } from "../types.js";

export function onApproveChat(ws: Peer, data: ApproveChatMessage): void {
    if (data.payload.peerInfo.signPubKey !== ws.signPubKey) {
        return;
    }
    chatService.approveChat(data.payload.chatId, data.payload.peerInfo, ws);
}
