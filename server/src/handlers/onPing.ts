import type { Peer } from "../types.js";
import type { PingMessage } from "shared";

export function onPing(ws: Peer, data: PingMessage) {
    ws.send(JSON.stringify({ type: "pong", payload: { ts: data.payload.ts } }));
}
