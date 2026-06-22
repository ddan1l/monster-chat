import { chatService } from "../container.js";

import type { OpenChatMessage, Peer } from "../types.js";

export function onOpenChat(ws: Peer, data: OpenChatMessage) {
    const { chatId, signPubKey } = data.payload;
    chatService.join(chatId, signPubKey, ws);
}
