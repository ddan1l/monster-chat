import { WebSocket } from "ws";

export type Peer = WebSocket & { chatId?: string; userId?: string };

export interface JoinMessage {
    type: "join";
    chatId: string;
    userId: string;
    publicKey?: number[];
}

export interface SendMessage {
    type: "message";
    chatId: string;
    payload: import("shared").Message;
}

export interface OnlineMessage {
    type: "online";
    userId: string;
}

export type ClientMessage = JoinMessage | SendMessage | OnlineMessage;
