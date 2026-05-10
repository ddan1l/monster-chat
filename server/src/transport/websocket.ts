import { WebSocketServer } from "ws";
import type { ClientMessage } from "../types.js";
import type { Peer } from "../types.js";
import { onOnline } from "../handlers/onOnline.js";
import { onOpenChat } from "../handlers/onOpenChat.js";
import { onInitChat } from "../handlers/onInitChat.js";
import { onApproveChat } from "../handlers/onApproveChat.js";
import { onKnockChat } from "../handlers/onKnockChat.js";
import { onPeerInfo } from "../handlers/onPeerInfo.js";
import { onMessage } from "../handlers/onMessage.js";
import { onClose } from "../handlers/onClose.js";

const handlers = {
    online: onOnline,
    open_chat: onOpenChat,
    init_chat: onInitChat,
    approve_chat: onApproveChat,
    knock_chat: onKnockChat,
    peer_info: onPeerInfo,
    message: onMessage,
} satisfies {
    [K in ClientMessage["type"]]: (
        ws: Peer,
        data: Extract<ClientMessage, { type: K }>
    ) => void;
};

export function startServer(port: number) {
    const wss = new WebSocketServer({ port });

    wss.on("connection", (ws: Peer) => {
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

    console.log(`Signaling server running on ws://localhost:${port}`);
}
