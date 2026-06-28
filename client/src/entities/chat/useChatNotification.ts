import { ref } from "vue";

import { useWs } from "@shared/api/useWs";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

import { activeChatId } from "@entities/chat/useChats";

import type { PeerInfo } from "shared";

export const unreadChatNotifications = ref<Record<string, number>>({});

export function useChatNotification() {
    const { readAll, write, remove } = useIndexedDb(STORES.CHAT_NOTIFICATIONS);
    const { subscribe } = useWs();
    const { read: readPeer } = useIndexedDb(STORES.PEERS);

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
            if (Notification.permission !== "granted") return;

            const peer = await readPeer<PeerInfo>(chatId);
            const title = peer?.name ?? "Monster Chat";
            const options: NotificationOptions = {
                body: "Новое сообщение",
                icon: "/icon-192.png",
                tag: chatId,
                data: { chatId },
            };

            if ("serviceWorker" in navigator) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(title, options);
            } else {
                const n = new Notification(title, options);
                n.onclick = () => {
                    window.focus();
                    window.location.href = `/chat/${chatId}`;
                };
            }
        });
    }

    return { loadNotifications, increment, clearUnread, startSync };
}
