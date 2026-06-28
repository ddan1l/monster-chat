import { ref } from "vue";

import { useLog } from "@shared/lib/useLog";

import type { ServerMessage, ClientMessage } from "shared";

type MessageHandler = (msg: ServerMessage) => void;
type Unsubscribe = () => void;

interface UseWs {
    connected: ReturnType<typeof ref<boolean>>;
    reconnecting: ReturnType<typeof ref<boolean>>;
    reconnectCount: ReturnType<typeof ref<number>>;
    txBytes: ReturnType<typeof ref<number>>;
    rxBytes: ReturnType<typeof ref<number>>;
    connectedAt: ReturnType<typeof ref<number | null>>;
    endpoint: string;
    connect: () => void;
    send: (payload: ClientMessage) => void;
    subscribe: <T extends ServerMessage["type"]>(
        type: T,
        handler: (msg: Extract<ServerMessage, { type: T }>) => void
    ) => Unsubscribe;
}

const ws = ref<WebSocket | null>(null);
const connected = ref(false);
const reconnecting = ref(false);
const reconnectCount = ref(0);
const txBytes = ref(0);
const rxBytes = ref(0);
const connectedAt = ref<number | null>(null);
const messageHandlers = new Set<MessageHandler>();
const sendQueue: ClientMessage[] = [];
let retryDelay = 1000;

const endpoint = import.meta.env.VITE_WS_URL as string;
const log = useLog("useWs");

export function useWs(): UseWs {
    function connect(): void {
        if (ws.value) return;

        log.info("connecting...");
        ws.value = new WebSocket(endpoint);
        ws.value.onopen = () => {
            log.info("connected");
            connected.value = true;
            reconnecting.value = false;
            connectedAt.value = Date.now();
            retryDelay = 1000;
            while (sendQueue.length) send(sendQueue.shift()!);
        };
        ws.value.onmessage = ({ data }) => {
            rxBytes.value += (data as string).length;
            const msg: ServerMessage = JSON.parse(data);
            if (msg.type !== "pong") log.info("←", msg.type, msg);
            messageHandlers.forEach((h) => h(msg));
        };
        ws.value.onclose = () => {
            log.warn(`disconnected, retrying in ${retryDelay}ms`);
            ws.value = null;
            connected.value = false;
            reconnecting.value = true;
            connectedAt.value = null;
            reconnectCount.value++;
            sendQueue.length = 0;
            setTimeout(() => connect(), retryDelay);
            retryDelay = Math.min(retryDelay * 2, 30_000);
        };
    }

    function subscribe<T extends ServerMessage["type"]>(
        type: T,
        handler: (msg: Extract<ServerMessage, { type: T }>) => void
    ): Unsubscribe {
        const wrapper: MessageHandler = (msg) => {
            if (msg.type === type) {
                handler(msg as Extract<ServerMessage, { type: T }>);
            }
        };
        messageHandlers.add(wrapper);
        return () => messageHandlers.delete(wrapper);
    }

    function send(payload: ClientMessage): void {
        if (ws.value?.readyState !== WebSocket.OPEN) {
            sendQueue.push(payload);
            return;
        }
        const str = JSON.stringify(payload);
        txBytes.value += str.length;
        if (payload.type !== "ping") log.info("→", payload.type, payload);
        ws.value.send(str);
    }

    return {
        connected,
        reconnecting,
        reconnectCount,
        txBytes,
        rxBytes,
        connectedAt,
        endpoint,
        connect,
        send,
        subscribe,
    };
}
