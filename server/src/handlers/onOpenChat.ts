import { chatService } from "../container.js";

import type { OpenChatMessage, Peer } from "../types.js";

export function onOpenChat(ws: Peer, data: OpenChatMessage) {
    if (!ws.signPubKey || !ws.deviceId) return;
    const { chatId, afterSeq } = data.payload;
    chatService.join(chatId, ws.deviceId, ws, afterSeq);
}
