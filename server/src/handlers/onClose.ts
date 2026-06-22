import { presenceService } from "../container.js";

import type { Peer } from "../types.js";

export function onClose(ws: Peer) {
    presenceService.unregister(ws);
}
