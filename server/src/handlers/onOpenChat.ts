import type { OpenChatMessage, Peer } from "../types.js";
import { chatService } from "../container.js";

export function onOpenChat(ws: Peer, data: OpenChatMessage) {
    chatService.join(data.payload.chatId, data.payload.signPubKey, ws);
}
