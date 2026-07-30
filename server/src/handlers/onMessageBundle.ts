import { chatService } from "../container.js";
import { allowMessage, BURST } from "../rateLimit.js";

import type { SendBundleMessage, Peer } from "../types.js";

// v2 (FS): один логический месседж с per-device копиями. Гейт from + rate-limit
// как у v1; дальше ChatService разворачивает и доставляет по устройствам.
export function onMessageBundle(ws: Peer, data: SendBundleMessage): void {
    const { payload } = data;
    if (payload.from !== ws.signPubKey) {
        return;
    }

    ws.msgBucket ??= { tokens: BURST, lastRefill: Date.now() };
    if (!allowMessage(ws.msgBucket)) {
        return;
    }

    chatService.deliverBundle(payload, ws.deviceId);
}
