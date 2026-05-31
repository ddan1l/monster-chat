import { ref } from "vue";
import type { ServerMessage, ClientMessage } from "shared";
import { useLog } from "@shared/lib/useLog";

type MessageHandler = (msg: ServerMessage) => void;
type Unsubscribe = () => void;

interface UseWs {
    connected: ReturnType<typeof ref<boolean>>;
    reconnecting: ReturnType<typeof ref<boolean>>;
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
const messageHandlers = new Set<MessageHandler>();
let retryDelay = 1000;

const log = useLog("useWs");

export function useWs(): UseWs {
    function connect(): void {
        if (ws.value) return;

        log.info("connecting...");
        ws.value = new WebSocket(import.meta.env.VITE_WS_URL);
        ws.value.onopen = () => {
            log.info("connected");
            connected.value = true;
            reconnecting.value = false;
            retryDelay = 1000;
        };
        ws.value.onmessage = ({ data }) => {
            const msg: ServerMessage = JSON.parse(data);
            log.info("←", msg.type, msg);
            messageHandlers.forEach((h) => h(msg));
        };
        ws.value.onclose = () => {
            log.warn(`disconnected, retrying in ${retryDelay}ms`);
            ws.value = null;
            connected.value = false;
            reconnecting.value = true;
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
        log.info("→", payload.type, payload);
        ws.value?.send(JSON.stringify(payload));
    }

    return { connected, reconnecting, connect, send, subscribe };
}
