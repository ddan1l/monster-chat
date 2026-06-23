import { WebSocketServer } from "ws";

import { onApproveChat } from "../handlers/onApproveChat.js";
import { onCancelChat } from "../handlers/onCancelChat.js";
import { onClose } from "../handlers/onClose.js";
import { onInitChat } from "../handlers/onInitChat.js";
import { onKnockChat } from "../handlers/onKnockChat.js";
import { onMessage } from "../handlers/onMessage.js";
import { onOnline } from "../handlers/onOnline.js";
import { onOpenChat } from "../handlers/onOpenChat.js";
import { onPeerInfo } from "../handlers/onPeerInfo.js";
import { onTyping } from "../handlers/onTyping.js";

import type { Peer, ClientMessage } from "../types.js";
import type { Server, IncomingMessage } from "http";

const handlers = {
    online: onOnline,
    open_chat: onOpenChat,
    init_chat: onInitChat,
    approve_chat: onApproveChat,
    knock_chat: onKnockChat,
    peer_info: onPeerInfo,
    message: onMessage,
    typing: onTyping,
    stop_typing: onTyping,
    cancel_chat: onCancelChat,
} satisfies {
    [K in ClientMessage["type"]]: (
        ws: Peer,
        data: Extract<ClientMessage, { type: K }>
    ) => void;
};

export function attachWebSocket(server: Server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: Peer, req: IncomingMessage) => {
        ws.ip =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
            req.socket.remoteAddress;
        ws.on("message", (raw) => {
            let data: ClientMessage;
            try {
                data = JSON.parse(raw.toString());
            } catch {
                ws.close(1003, "Invalid JSON");
                return;
            }

            const handler = handlers[data?.type as keyof typeof handlers];

            if (!handler) {
                ws.close(1003, "Unknown message type");
                return;
            }

            handler(ws, data as never);
        });

        ws.on("close", () => onClose(ws));
    });

    console.log("WebSocket server attached");
}
