import type { SendMessage } from "../types.js";
import type { Peer } from "../types.js";
import { chatService, presenceService } from "../container.js";

export function onMessage(ws: Peer, data: SendMessage) {
    const { chatId, payload } = data;

    const recipients = chatService.getRecipients(chatId, ws);
    chatService.deliver(chatId, payload, recipients);

    if (recipients.length === 0) {
        const participantIds = chatService.getParticipantIds(chatId);
        presenceService.notify(payload, participantIds);
    }
}
