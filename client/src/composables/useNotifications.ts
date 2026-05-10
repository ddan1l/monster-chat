import { ref } from "vue";
import { useUser } from "./useUser";
import { useWs } from "./useWs";
import { useCrypto } from "./useCrypto";
import { OnlineMessage } from "shared";

const unread = ref<Record<string, number>>({});
const permissionGranted = ref(Notification.permission === "granted");
const permissionDenied = ref(Notification.permission === "denied");

export function useNotifications() {
    const { user, load: loadUser } = useUser();
    const { send, subscribe } = useWs();
    const { exportSignPublicKey } = useCrypto();

    subscribe("notification", (msg) => {
        unread.value[msg.payload.chatId] =
            (unread.value[msg.payload.chatId] ?? 0) + 1;

        if (permissionGranted.value) {
            new Notification("New message", { body: msg.payload.text });
        }
    });

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;

        const signPubKey = await exportSignPublicKey();
        send({
            type: "online",
            payload: { signPubKey },
        } satisfies OnlineMessage);
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

    return {
        unread,
        permissionGranted,
        permissionDenied,
        init,
        requestPermission,
        clearUnread,
    };
}
