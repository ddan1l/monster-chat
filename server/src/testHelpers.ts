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

export interface AccountDelivery {
    key: string;
    msg: ServerMessage;
}

// Рекордер NotificationService: копит sendEvent/notify/deliverToAccount/fanLive
// вместо реальной отправки.
export function notifRecorder() {
    const sent: SentEvent[] = [];
    const notified: NotifyCall[] = [];
    const delivered: AccountDelivery[] = [];
    const fanned: AccountDelivery[] = [];
    const service = {
        sendEvent(peer: Peer, msg: ServerMessage) {
            sent.push({ peer, msg });
        },
        notify(key: string, chatId: string, unread: number) {
            notified.push({ key, chatId, unread });
        },
        deliverToAccount(key: string, msg: ServerMessage) {
            delivered.push({ key, msg });
        },
        fanLive(key: string, msg: ServerMessage) {
            fanned.push({ key, msg });
        },
    } as unknown as NotificationService;
    const typesTo = (peer: Peer) =>
        sent.filter((e) => e.peer === peer).map((e) => e.msg.type);
    // Типы событий, доставленных аккаунту (deliverToAccount).
    const deliveredTo = (key: string) =>
        delivered.filter((e) => e.key === key).map((e) => e.msg.type);
    return {
        service,
        sent,
        notified,
        delivered,
        fanned,
        typesTo,
        deliveredTo,
    };
}

// Рекордер UserEventQueue (per-device).
export function queueRecorder(): UserEventQueue & {
    pushed: { key: string; deviceId: string; event: ServerMessage }[];
} {
    const pushed: { key: string; deviceId: string; event: ServerMessage }[] =
        [];
    return {
        pushed,
        push(key, deviceId, event) {
            pushed.push({ key, deviceId, event });
        },
        flush() {
            return [];
        },
    };
}
