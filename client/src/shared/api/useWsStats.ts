import { ref, computed, watch, onUnmounted } from "vue";

import { useWs } from "./useWs";

const ping = ref<number | null>(null);
let pingTimer: ReturnType<typeof setInterval> | null = null;
let sessionTimer: ReturnType<typeof setInterval> | null = null;
const sessionSeconds = ref(0);

export function useWsStats() {
    const {
        connected,
        connectedAt,
        reconnectCount,
        txBytes,
        rxBytes,
        endpoint,
        send,
        subscribe,
    } = useWs();

    // Ping
    const unsub = subscribe("pong", (msg) => {
        ping.value = Date.now() - msg.payload.ts;
    });

    watch(connected, (val) => {
        if (!val) ping.value = null;
    });

    function sendPing() {
        if (connected.value) {
            send({ type: "ping", payload: { ts: Date.now() } });
        }
    }

    function startPing() {
        sendPing();
        pingTimer = setInterval(sendPing, 10_000);
    }

    function startSession() {
        sessionTimer = setInterval(() => {
            if (connectedAt.value) {
                sessionSeconds.value = Math.floor(
                    (Date.now() - connectedAt.value) / 1000
                );
            } else {
                sessionSeconds.value = 0;
            }
        }, 1000);
    }

    startPing();
    startSession();

    onUnmounted(() => {
        unsub();
        if (pingTimer) clearInterval(pingTimer);
        if (sessionTimer) clearInterval(sessionTimer);
    });

    const pingLabel = computed(() =>
        ping.value !== null ? `${ping.value}ms` : "—"
    );

    const sessionLabel = computed(() => {
        const m = Math.floor(sessionSeconds.value / 60);
        if (m === 0) return "<1min";
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    });

    const txLabel = computed(() => formatBytes(txBytes.value ?? 0));
    const rxLabel = computed(() => formatBytes(rxBytes.value ?? 0));

    const signalBars = computed(() => {
        const p = ping.value;
        if (p === null) return 0;
        if (p < 80) return 3;
        if (p < 200) return 2;
        return 1;
    });

    const endpointLabel = computed(
        () => endpoint?.replace(/^wss?:\/\//, "") ?? "—"
    );

    return {
        connected,
        reconnectCount,
        pingLabel,
        sessionLabel,
        txLabel,
        rxLabel,
        signalBars,
        endpointLabel,
    };
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}b`;
    return `${(bytes / 1024).toFixed(1)}kb`;
}
