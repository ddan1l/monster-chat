import { WebSocketServer } from "ws";

import { generateNonce } from "../crypto.js";
import { onApproveChat } from "../handlers/onApproveChat.js";
import { onAuth } from "../handlers/onAuth.js";
import { onCancelChat } from "../handlers/onCancelChat.js";
import { onClose } from "../handlers/onClose.js";
import { onDeleteChat } from "../handlers/onDeleteChat.js";
import { onDeleteChatForAll } from "../handlers/onDeleteChatForAll.js";
import { onGetPrekeys } from "../handlers/onGetPrekeys.js";
import { onInitChat } from "../handlers/onInitChat.js";
import { onKnockChat } from "../handlers/onKnockChat.js";
import { onMarkRead } from "../handlers/onMarkRead.js";
import { onMessage } from "../handlers/onMessage.js";
import { onMessageBundle } from "../handlers/onMessageBundle.js";
import { onOnline } from "../handlers/onOnline.js";
import { onOpenChat } from "../handlers/onOpenChat.js";
import { onPeerInfo } from "../handlers/onPeerInfo.js";
import { onPing } from "../handlers/onPing.js";
import { onPublishPrekey } from "../handlers/onPublishPrekey.js";
import { onSetAway } from "../handlers/onSetAway.js";
import { onSetOnline } from "../handlers/onSetOnline.js";
import { onTyping } from "../handlers/onTyping.js";

import type { Peer, ClientMessage } from "../types.js";
import type { Server, IncomingMessage } from "http";

const handlers = {
    auth: onAuth,
    online: onOnline,
    open_chat: onOpenChat,
    init_chat: onInitChat,
    approve_chat: onApproveChat,
    knock_chat: onKnockChat,
    peer_info: onPeerInfo,
    message: onMessage,
    message_bundle: onMessageBundle,
    typing: onTyping,
    stop_typing: onTyping,
    cancel_chat: onCancelChat,
    mark_read: onMarkRead,
    delete_chat: onDeleteChat,
    delete_chat_for_all: onDeleteChatForAll,
    ping: onPing,
    set_away: onSetAway,
    set_online: onSetOnline,
    publish_prekey: onPublishPrekey,
    get_prekeys: onGetPrekeys,
} satisfies {
    [K in ClientMessage["type"]]: (
        ws: Peer,
        data: Extract<ClientMessage, { type: K }>
    ) => void;
};

const MAX_WS_MESSAGE_BYTES = Number(
    process.env.MAX_WS_MESSAGE_BYTES ?? 256 * 1024
);

export function attachWebSocket(server: Server) {
    const wss = new WebSocketServer({
        server,
        maxPayload: MAX_WS_MESSAGE_BYTES,
    });

    wss.on("connection", (ws: Peer, req: IncomingMessage) => {
        ws.ip =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ??
            req.socket.remoteAddress;

        // Proof-of-possession: до подписи challenge личность не установлена.
        ws.authNonce = generateNonce();
        ws.send(
            JSON.stringify({
                type: "challenge",
                payload: { nonce: ws.authNonce },
            })
        );

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

            // До аутентификации разрешены только auth и ping.
            if (!ws.authed && data.type !== "auth" && data.type !== "ping") {
                ws.close(4401, "Unauthenticated");
                return;
            }

            handler(ws, data as never);
        });

        ws.on("close", () => onClose(ws));
    });

    console.log("WebSocket server attached");
}
