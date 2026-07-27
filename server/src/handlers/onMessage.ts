import { chatService } from "../container.js";
import { allowMessage, BURST } from "../rateLimit.js";

import type { SendMessage, Peer } from "../types.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { payload } = data;
    // Отправитель не может выдавать себя за другого: from обязан совпадать с
    // аутентифицированным ключом соединения.
    if (payload.from !== ws.signPubKey) return;

    // Rate-limit персистирующего пути: бакет стартует полным, чтобы не штрафовать
    // на старте. Отброшенное сообщение не ACK-ается — outbox ретраит на реконнекте.
    ws.msgBucket ??= { tokens: BURST, lastRefill: Date.now() };
    if (!allowMessage(ws.msgBucket)) return;

    chatService.deliver(payload.chatId, payload, ws.deviceId);
}
