import type { ReadReceiptMessage } from "../types.js";
import type { Peer } from "../types.js";
import { chatService } from "../container.js";

export function onReadReceipt(ws: Peer, data: ReadReceiptMessage) {
    chatService.relayReadReceipt(data.payload.chatId, data.payload.nonce, ws);
}
