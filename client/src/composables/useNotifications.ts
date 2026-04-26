import { ref, onUnmounted } from "vue";
import type { ServerMessage } from "shared";
import { useUser } from "./useUser";

const unread = ref<Record<string, number>>({});
const permissionGranted = ref(Notification.permission === "granted");
const permissionDenied = ref(Notification.permission === "denied");

export function useNotifications() {
    const ws = ref<WebSocket | null>(null);
    const { user, load: loadUser } = useUser();

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;

        ws.value = new WebSocket("ws://localhost:3000");

        ws.value.onopen = () => {
            ws.value!.send(
                JSON.stringify({ type: "online", userId: user.value!.id })
            );
        };

        ws.value.onmessage = ({ data }) => {
            const msg: ServerMessage = JSON.parse(data);
            if (msg.type !== "notification") return;

            unread.value[msg.payload.chatId] =
                (unread.value[msg.payload.chatId] ?? 0) + 1;

            if (permissionGranted.value) {
                new Notification("New message", { body: msg.payload.text });
            }
        };
    }

    async function requestPermission() {
        if (Notification.permission === "denied") {
            permissionDenied.value = true;
            return;
        }
        const result = await Notification.requestPermission();
        permissionGranted.value = result === "granted";
        permissionDenied.value = result === "denied";
    }

    function clearUnread(chatId: string) {
        delete unread.value[chatId];
    }

    onUnmounted(() => ws.value?.close());

    return {
        unread,
        permissionGranted,
        permissionDenied,
        init,
        requestPermission,
        clearUnread,
    };
}
