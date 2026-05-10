import type { OnlineMessage } from "../types.js";
import type { Peer } from "../types.js";
import { presenceService } from "../container.js";

export function onOnline(ws: Peer, data: OnlineMessage) {
    presenceService.register(data.payload.signPubKey, ws);
}
