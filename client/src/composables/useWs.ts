import { ref, onUnmounted } from "vue";
import type { ServerMessage } from "shared";

export function useWs() {
    const ws = ref<WebSocket | null>(null);

    function connect(
        onOpen: () => void,
        onMessage: (msg: ServerMessage) => void,
        onClose?: () => void
    ) {
        ws.value = new WebSocket("ws://localhost:3000");
        ws.value.onopen = onOpen;
        ws.value.onmessage = ({ data }) => onMessage(JSON.parse(data));
        if (onClose) ws.value.onclose = onClose;
    }

    function send(payload: unknown) {
        ws.value?.send(JSON.stringify(payload));
    }

    function close() {
        ws.value?.close();
    }

    onUnmounted(() => ws.value?.close());

    return { connect, send, close };
}
