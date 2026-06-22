import { chatService } from "../container.js";

import type { InitChatMessage, Peer } from "../types.js";

export function onInitChat(ws: Peer, data: InitChatMessage): void {
    chatService.initChat(data.payload.chatId, data.payload.hostKey, ws);
}
