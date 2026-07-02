import { presenceService } from "../container.js";

import type { Peer } from "../types.js";
import type { SetAwayMessage } from "shared";

export function onSetAway(ws: Peer, _data: SetAwayMessage): void {
    if (!ws.signPubKey) return;
    presenceService.setAway(ws.signPubKey, ws.watchedPeers ?? []);
}
