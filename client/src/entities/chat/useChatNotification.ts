import { ref } from "vue";
import type { OnlineMessage, PeerInfo } from "shared";
import { useWs } from "@shared/api/useWs";
import { useUser } from "@entities/user/useUser";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useNotifications } from "@shared/lib/useNotifications";
import { activeChatId } from "@entities/chat/useChats";

const unread = ref<Record<string, number>>({});
let notifySubscribed = false;

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

export function useChatNotification() {
    const { subscribe, send } = useWs();
    const { user, load: loadUser } = useUser();
    const { exportSignPublicKey, signKeyPair } = useCrypto();
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { notify } = useNotifications();

    if (!notifySubscribed) {
        notifySubscribed = true;
        subscribe("notification", async (msg) => {
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
    }

    async function init() {
        if (!user.value) await loadUser();
        if (!user.value) return;
        if (!signKeyPair.value) return;

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
