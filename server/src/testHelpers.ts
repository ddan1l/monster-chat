import type { UserEventQueue } from "./queues/UserEventQueue.js";
import type { NotificationService } from "./services/NotificationService.js";
import type { Peer } from "./types.js";
import type { ChatMessage, ServerMessage } from "shared";

// Онлайн-«соединение» для тестов: sendEvent наши рекордеры перехватывают, так
// что реальный send() никогда не зовётся.
export function fakePeer(over: Partial<Peer> = {}): Peer {
    return { readyState: 1, send() {}, ...over } as unknown as Peer;
}

export function makeMsg(over: Partial<ChatMessage> = {}): ChatMessage {
    return {
        chatId: "c1",
        from: "A",
        to: "B",
        nonce: crypto.randomUUID(),
        iv: "iv",
        payload: "payload",
        timestamp: Date.now(),
        signature: "sig",
        ...over,
    };
}

export interface SentEvent {
    peer: Peer;
    msg: ServerMessage;
}
export interface NotifyCall {
    key: string;
    chatId: string;
    unread: number;
}

// Рекордер NotificationService: копит sendEvent/notify вместо реальной отправки.
export function notifRecorder() {
    const sent: SentEvent[] = [];
    const notified: NotifyCall[] = [];
    const service = {
        sendEvent(peer: Peer, msg: ServerMessage) {
            sent.push({ peer, msg });
        },
        notify(key: string, chatId: string, unread: number) {
            notified.push({ key, chatId, unread });
        },
    } as unknown as NotificationService;
    const typesTo = (peer: Peer) =>
        sent.filter((e) => e.peer === peer).map((e) => e.msg.type);
    return { service, sent, notified, typesTo };
}

// Рекордер UserEventQueue.
export function queueRecorder(): UserEventQueue & {
    pushed: { key: string; event: ServerMessage }[];
} {
    const pushed: { key: string; event: ServerMessage }[] = [];
    return {
        pushed,
        push(key, event) {
            pushed.push({ key, event });
        },
        flush() {
            return [];
        },
    };
}
