import { chatService, presenceService } from "../container.js";

import type { SendMessage, Peer } from "../types.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { payload } = data;
    const { chatId } = payload;

    chatService.deliver(chatId, payload);

    if (!payload.isAction) {
        presenceService.notify(chatId, payload.to);
    }
}
