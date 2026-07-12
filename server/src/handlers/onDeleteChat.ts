import { chatService } from "../container.js";

import type { DeleteChatMessage, Peer } from "../types.js";

export function onDeleteChat(ws: Peer, data: DeleteChatMessage) {
    if (!ws.signPubKey) return;
    chatService.deleteChatForMe(data.payload.chatId, ws.signPubKey);
}
