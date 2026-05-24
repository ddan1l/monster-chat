import { ref } from "vue";
import type { OnlineMessage, PeerInfo } from "shared";
import { useWs } from "../infrastructure/useWs";
import { useUser } from "../user/useUser";
import { useCrypto } from "../infrastructure/useCrypto";
import { useIndexedDb, STORES } from "../infrastructure/useIndexedDb";
import { useNotifications } from "../infrastructure/useNotifications";
import { activeChatId } from "./useChats";

const unread = ref<Record<string, number>>({});

const { subscribe: _subscribe } = useWs();
const { read: readPeer } = useIndexedDb(STORES.PEERS);
const { notify } = useNotifications();

_subscribe("notification", async (msg) => {
    unread.value[msg.payload.chatId] =
        (unread.value[msg.payload.chatId] ?? 0) + 1;

    if (activeChatId.value !== msg.payload.chatId) {
        const peer = await readPeer<PeerInfo>(msg.payload.chatId);
        notify(`Новое сообщение от ${peer?.name ?? "неизвестного"}`);
    }
});

export function useChatNotification() {
    const { user, load: loadUser } = useUser();
    const { send } = useWs();
    const { exportSignPublicKey } = useCrypto();

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;

        const signPubKey = await exportSignPublicKey();
        send({ type: "online", payload: { signPubKey } } satisfies OnlineMessage);
    }

    function clearUnread(chatId: string) {
        delete unread.value[chatId];
    }

    return { unread, init, clearUnread };
}
