import { WebSocketServer } from "ws";
import type { ClientMessage } from "../types.js";
import type { Peer } from "../types.js";
import { onOnline } from "../handlers/onOnline.js";
import { onJoin } from "../handlers/onJoin.js";
import { onMessage } from "../handlers/onMessage.js";
import { onClose } from "../handlers/onClose.js";

const handlers = {
    online: onOnline,
    join: onJoin,
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
            const data: ClientMessage = JSON.parse(raw.toString());
            const handler = handlers[data.type];
            handler(ws, data as never);
        });

        ws.on("close", () => onClose(ws));
    });

    console.log(`Signaling server running on ws://localhost:${port}`);
}
