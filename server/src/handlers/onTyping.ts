import { presenceService } from "../container.js";

import type { Peer, TypingMessage, StopTypingMessage } from "../types.js";

export function onTyping(ws: Peer, data: TypingMessage | StopTypingMessage) {
    if (!ws.signPubKey) return;
    const type = data.type === "typing" ? "peer_typing" : "peer_stop_typing";
    presenceService.broadcastTyping(ws.signPubKey, data.payload.to, type);
}
