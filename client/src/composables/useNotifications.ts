import { ref } from "vue";
import { useUser } from "./useUser";
import { useWs } from "./useWs";

const unread = ref<Record<string, number>>({});
const permissionGranted = ref(Notification.permission === "granted");
const permissionDenied = ref(Notification.permission === "denied");

export function useNotifications() {
    const { user, load: loadUser } = useUser();
    const { connect, send } = useWs();

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;

        connect(
            () => send({ type: "online", userId: user.value!.id }),
            (msg) => {
                if (msg.type !== "notification") return;

                unread.value[msg.payload.chatId] =
                    (unread.value[msg.payload.chatId] ?? 0) + 1;

                if (permissionGranted.value) {
                    new Notification("New message", { body: msg.payload.text });
                }
            }
        );
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
