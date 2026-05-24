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

function emojiToIcon(emoji: string): string {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "48px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 32, 32);
    return canvas.toDataURL();
}

const unsubNotify = _subscribe("notification", async (msg) => {
    if (activeChatId.value !== msg.payload.chatId) {
        unread.value[msg.payload.chatId] =
            (unread.value[msg.payload.chatId] ?? 0) + 1;
    }

    const peer = await readPeer<PeerInfo>(msg.payload.chatId);
    notify(peer?.name ?? "Новое сообщение", {
        body: "Новое сообщение",
        icon: peer?.avatar ? emojiToIcon(peer.avatar) : undefined,
        tag: msg.payload.chatId,
        renotify: true,
        url: `/chat/${msg.payload.chatId}`,
    });
});

if (import.meta.hot) {
    import.meta.hot.dispose(unsubNotify);
}

export function useChatNotification() {
    const { user, load: loadUser } = useUser();
    const { send } = useWs();
    const { exportSignPublicKey } = useCrypto();

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;

        const signPubKey = await exportSignPublicKey();
        send({
            type: "online",
            payload: { signPubKey },
        } satisfies OnlineMessage);
    }

    function clearUnread(chatId: string) {
        delete unread.value[chatId];
    }

    return { unread, init, clearUnread };
}
