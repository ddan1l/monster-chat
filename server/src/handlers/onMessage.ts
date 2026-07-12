import { chatService } from "../container.js";

import type { SendMessage, Peer } from "../types.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { payload } = data;
    // Отправитель не может выдавать себя за другого: from обязан совпадать с
    // аутентифицированным ключом соединения.
    if (payload.from !== ws.signPubKey) return;
    chatService.deliver(payload.chatId, payload);
}
