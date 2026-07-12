import { chatService } from "../container.js";

import type { MarkReadMessage, Peer } from "../types.js";

export function onMarkRead(ws: Peer, data: MarkReadMessage) {
    if (!ws.signPubKey) return;
    chatService.markRead(data.payload.chatId, ws.signPubKey);
}
