import { WebSocketServer, WebSocket } from "ws";
import type { ClientMessage } from "shared";

const wss = new WebSocketServer({ port: 3000 });

const rooms = new Map<string, WebSocket[]>();

wss.on("connection", (ws: WebSocket & { roomId?: string }) => {
    ws.on("message", (message) => {
        const data: ClientMessage = JSON.parse(message.toString());
        const { type, roomId } = data;

        if (type === "join") {
            if (!rooms.has(roomId)) {
                rooms.set(roomId, []);
            }
            rooms.get(roomId)!.push(ws);
            ws.roomId = roomId;
            return;
        }

        if (type === "offer" || type === "answer" || type === "ice-candidate") {
            const clients = rooms.get(roomId) ?? [];

            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(
                        JSON.stringify({ type, payload: data.payload })
                    );
                }
            });
        }
    });

    ws.on("close", () => {
        if (ws.roomId && rooms.has(ws.roomId)) {
            rooms.set(
                ws.roomId,
                rooms.get(ws.roomId)!.filter((c) => c !== ws)
            );
        }
    });
});

console.log("Signaling server running on ws://localhost:3000");
