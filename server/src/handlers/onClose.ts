import type { Peer } from "../types.js";
import { chatService, presenceService } from "../container.js";

export function onClose(ws: Peer) {
    presenceService.unregister(ws);
}
