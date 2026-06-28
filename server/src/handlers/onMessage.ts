import { chatService } from "../container.js";

import type { SendMessage, Peer } from "../types.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { payload } = data;
    chatService.deliver(payload.chatId, payload);
}
