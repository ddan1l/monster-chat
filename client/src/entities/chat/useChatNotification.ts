import { ref } from "vue";

import { useWs } from "@shared/api/useWs";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useNotifications } from "@shared/lib/useNotifications";
import { useVisibility } from "@shared/lib/useVisibility";

import { activeChatId } from "@entities/chat/useChats";
import { avatarIconUrl } from "@entities/user/useAvatar";

import type { PeerInfo } from "shared";

export const unreadChatNotifications = ref<Record<string, number>>({});

export function useChatNotification() {
    const { readAll, write, remove } = useIndexedDb(STORES.CHAT_NOTIFICATIONS);
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { subscribe } = useWs();
    const { notify } = useNotifications();
    const { isVisible } = useVisibility();

    async function loadNotifications(): Promise<void> {
        const entries = await readAll<{ chatId: string; count: number }>();
        for (const { chatId, count } of entries) {
            unreadChatNotifications.value[chatId] = count;
        }
    }

    async function incrementUnread(chatId: string): Promise<void> {
        unreadChatNotifications.value[chatId] =
            (unreadChatNotifications.value[chatId] ?? 0) + 1;
        await write({ chatId, count: unreadChatNotifications.value[chatId] });
    }

    async function clearUnread(chatId: string): Promise<void> {
        delete unreadChatNotifications.value[chatId];
        await remove(chatId);
    }

    function startSync(): void {
        loadNotifications();

        subscribe("notification", async (msg) => {
            const { chatId } = msg.payload;

            if (activeChatId.value !== chatId) {
                await incrementUnread(chatId);
            }

            if (msg.payload.silent) return;
            if (isVisible.value && activeChatId.value === chatId) return;

            const peer = await readPeer<PeerInfo>(chatId);
            await notify(peer?.name ?? "Monster Chat", {
                body: "Новое сообщение",
                icon: peer?.avatar
                    ? await avatarIconUrl(peer.avatar)
                    : undefined,
                data: { chatId },
            });
        });
    }

    return { loadNotifications, incrementUnread, clearUnread, startSync };
}
