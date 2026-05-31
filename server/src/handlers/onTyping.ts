import type { Peer } from "../types.js";
import type { TypingMessage, StopTypingMessage } from "../types.js";
import { presenceService } from "../container.js";

export function onTyping(ws: Peer, data: TypingMessage | StopTypingMessage) {
    const { chatId, from } = data.payload;
    const type = data.type === "typing" ? "peer_typing" : "peer_stop_typing";
    presenceService.broadcastTyping(chatId, from, type);
}
