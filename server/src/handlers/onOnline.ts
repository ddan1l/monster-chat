import { presenceService } from "../container.js";

import type { OnlineMessage, Peer } from "../types.js";

export function onOnline(ws: Peer, data: OnlineMessage) {
    presenceService.register(data.payload.signPubKey, ws, data.payload.peers);
}
