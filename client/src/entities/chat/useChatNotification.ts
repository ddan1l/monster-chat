import { ref } from "vue";

import { useNotifications } from "@shared/lib/useNotifications";
import { useVisibility } from "@shared/lib/useVisibility";
import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { activeChatId, activeChatAtBottom } from "@entities/chat/useChats";
import { avatarIconUrl } from "@entities/user/useAvatar";

import type { PeerInfo } from "shared";

export const unreadChatNotifications = ref<Record<string, number>>({});

export function useChatNotification() {
    const { readAll, write, remove } = useIndexedDb(STORES.CHAT_NOTIFICATIONS);
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { subscribe, send } = useWs();
    const { notify } = useNotifications();
    const { isVisible } = useVisibility();

    async function loadNotifications(): Promise<void> {
        const entries = await readAll<{ chatId: string; count: number }>();
        for (const { chatId, count } of entries) {
            unreadChatNotifications.value[chatId] = count;
        }
    }

    async function setUnread(chatId: string, count: number): Promise<void> {
        if (count <= 0) {
            delete unreadChatNotifications.value[chatId];
            await remove(chatId);
            return;
        }
        unreadChatNotifications.value[chatId] = count;
        await write({ chatId, count });
    }

    // Сброс непрочитанных: сервер — источник истины, локальный кеш вторичен.
    async function clearUnread(chatId: string): Promise<void> {
        send({ type: "mark_read", payload: { chatId } });
        delete unreadChatNotifications.value[chatId];
        await remove(chatId);
    }

    function startSync(): void {
        loadNotifications();

        // Снимок непрочитанных при подключении — заменяет локальный кеш.
        subscribe("unread", async (msg) => {
            const { counts } = msg.payload;
            for (const chatId of Object.keys(unreadChatNotifications.value)) {
                if (!(chatId in counts)) {
                    await setUnread(chatId, 0);
                }
            }
            for (const [chatId, count] of Object.entries(counts)) {
                // Открытый чат считается прочитанным (mark_read мог ещё не дойти).
                await setUnread(
                    chatId,
                    chatId === activeChatId.value ? 0 : count
                );
            }
        });

        subscribe("notification", async (msg) => {
            const { chatId, unreadCount } = msg.payload;

            // Тихое уведомление (read-синк с другого устройства аккаунта: счётчик
            // обнулён) — только гасим бейдж. НЕ отвечаем mark_read, иначе с
            // серверным fanLive выйдет пинг-понг.
            if (msg.payload.silent) {
                if (unreadCount !== undefined) {
                    await setUnread(chatId, unreadCount);
                }
                return;
            }

            // «Увидено сразу» — только если это активный чат, окно видимо И мы
            // внизу (сообщение появится на экране). Тогда viewport-read его
            // пометит; держим счётчик на нуле. Если чат открыт, но прокручен
            // вверх (сообщение не видно) — НЕ считаем прочитанным.
            const seenNow =
                activeChatId.value === chatId &&
                isVisible.value &&
                activeChatAtBottom.value;
            if (seenNow) {
                send({ type: "mark_read", payload: { chatId } });
                await setUnread(chatId, 0);
                return;
            }

            // Не видно сейчас: обновляем бейдж (сайдбар + пульс кнопки «вниз»).
            if (unreadCount !== undefined) {
                await setUnread(chatId, unreadCount);
            }

            // Уведомление шлём всегда, когда сообщение не увидено сразу: окно
            // скрыто, открыт другой чат, ИЛИ активный чат прокручен вверх.
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

    return { loadNotifications, clearUnread, startSync };
}
