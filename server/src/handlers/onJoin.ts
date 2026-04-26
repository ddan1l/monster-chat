import type { JoinMessage, Peer } from "../types.js";
import { chatService } from "../container.js";

export function onJoin(ws: Peer, data: JoinMessage) {
    chatService.join(data.chatId, data.userId, ws);
}
