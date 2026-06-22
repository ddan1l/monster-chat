import { chatService } from "../container.js";

import type { ReadReceiptMessage, Peer } from "../types.js";

export function onReadReceipt(ws: Peer, data: ReadReceiptMessage) {
    chatService.relayReadReceipt(data.payload.chatId, data.payload.nonce, ws);
}
