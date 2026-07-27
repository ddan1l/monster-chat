import { deviceRepository } from "../container.js";

import type { PublishPrekeyMessage, Peer } from "../types.js";

// Устройство публикует свой текущий эпохальный prekey. Подпись epochPub проверяет
// не сервер, а получатель при выборке (по известному identity-ключу пира), так
// что тут просто сохраняем от аутентифицированного устройства.
export function onPublishPrekey(ws: Peer, data: PublishPrekeyMessage): void {
    if (!ws.signPubKey || !ws.deviceId) return;
    const { epochId, epochPub, signature } = data.payload;
    deviceRepository.setPrekey(
        ws.signPubKey,
        ws.deviceId,
        epochId,
        epochPub,
        signature
    );
}
