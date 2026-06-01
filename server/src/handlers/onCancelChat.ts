import type { CancelChatMessage, Peer } from "../types.js";
import { chatService } from "../container.js";

export function onCancelChat(ws: Peer, data: CancelChatMessage): void {
    chatService.cancelChat(data.payload.chatId);
}
