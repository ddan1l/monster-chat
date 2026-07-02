import { presenceService } from "../container.js";

import type { Peer } from "../types.js";
import type { SetOnlineMessage } from "shared";

export function onSetOnline(ws: Peer, _data: SetOnlineMessage): void {
    if (!ws.signPubKey) return;
    presenceService.setOnline(ws.signPubKey, ws.watchedPeers ?? []);
}
