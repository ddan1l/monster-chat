import { presenceService } from "../container.js";

import type { OnlineMessage, Peer } from "../types.js";

export function onOnline(ws: Peer, data: OnlineMessage) {
    if (!ws.signPubKey) return;
    presenceService.register(ws.signPubKey, ws, data.payload.peers);
}
