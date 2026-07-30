import { chatService } from "../container.js";

import type { DeleteChatForAllMessage, Peer } from "../types.js";

export function onDeleteChatForAll(ws: Peer, data: DeleteChatForAllMessage) {
    if (!ws.signPubKey) {
        return;
    }
    chatService.deleteChatForAll(data.payload.chatId, ws.signPubKey);
}
