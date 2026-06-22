import { chatService } from "../container.js";

import type { CancelChatMessage, Peer } from "../types.js";

export function onCancelChat(ws: Peer, data: CancelChatMessage): void {
    chatService.cancelChat(data.payload.chatId);
}
