import { ref } from "vue";

import { useWs } from "@shared/api/useWs";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useNotifications } from "@shared/lib/useNotifications";

import { activeChatId } from "@entities/chat/useChats";

import type { PeerInfo } from "shared";

export const unreadChatNotifications = ref<Record<string, number>>({});

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
    const { readAll, write, remove } = useIndexedDb(STORES.CHAT_NOTIFICATIONS);
    const { subscribe } = useWs();
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { notify } = useNotifications();

    async function loadNotifications(): Promise<void> {
        const entries = await readAll<{ chatId: string; count: number }>();
        for (const { chatId, count } of entries) {
            unreadChatNotifications.value[chatId] = count;
        }
    }

    async function increment(chatId: string): Promise<void> {
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
                await increment(chatId);
            }

            if (!document.hidden && activeChatId.value === chatId) return;

            const peer = await readPeer<PeerInfo>(chatId);
            notify(peer?.name ?? "Новое сообщение", {
                body: "Новое сообщение",
                icon: peer?.avatar ? emojiToIcon(peer.avatar) : undefined,
                tag: chatId,
                renotify: true,
                url: `/chat/${chatId}`,
            });
        });
    }

    return { loadNotifications, increment, clearUnread, startSync };
}
