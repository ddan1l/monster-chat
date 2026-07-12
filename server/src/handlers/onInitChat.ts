import { chatService } from "../container.js";

import type { InitChatMessage, Peer } from "../types.js";

export function onInitChat(ws: Peer, data: InitChatMessage): void {
    if (!ws.signPubKey) return;
    chatService.initChat(data.payload.chatId, ws.signPubKey, ws);
}
