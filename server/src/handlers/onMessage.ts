import type { SendMessage } from "../types.js";
import type { Peer } from "../types.js";
import { chatService, presenceService } from "../container.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { payload } = data;
    const { chatId } = payload;

    chatService.deliver(chatId, payload, ws);

    if (!payload.isEdit) {
        const participantIds = chatService.getParticipantIds(chatId);
        presenceService.notify(payload, participantIds);
    }
}
