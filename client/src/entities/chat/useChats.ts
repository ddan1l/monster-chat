import { ref, toRaw } from "vue";

import { nanoid } from "nanoid";
import { useRouter } from "vue-router";

import { useCrypto } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { useKnocks, pendingKnocks } from "@entities/chat/usePendingKnocks";
import { useChatMessages } from "@entities/message/useMessages";
import { usePeers } from "@entities/peer/usePeers";

import type { Chat } from "shared";

export const chats = ref<Chat[]>([]);
export const activeChatId = ref<string | null>(null);

export function useChats() {
    const {
        readAll: readAllChats,
        write: saveChat,
        read: readChat,
        remove: removeChat,
    } = useIndexedDb(STORES.CHATS);

    const { savePeer, removePeer, getMyPeerInfo } = usePeers();
    const { removeKnock } = useKnocks();

    const { send: wsSend, subscribe } = useWs();
    const { exportSignPublicKey } = useCrypto();
    const { removeAllByChat } = useChatMessages();
    const router = useRouter();

    async function loadChats(): Promise<void> {
        chats.value = await readAllChats<Chat>();
    }

    function startSync(): void {
        subscribe("chat_created", async (msg) => {
            const { chatId } = msg.payload;
            const existing = await readChat<Chat>(chatId);

            const updated: Chat = existing
                ? { ...existing, established: true }
                : { id: chatId, established: true, createdAt: Date.now() };

            await saveChat(updated);

            const index = chats.value.findIndex((c) => c.id === chatId);

            if (index !== -1) {
                chats.value[index] = updated;
            } else {
                chats.value.push(updated);
            }
        });

        subscribe("chat_list", async (msg) => {
            const leftedSet = new Set(msg.payload.lefted);
            for (const chatId of msg.payload.chatIds) {
                const lefted = leftedSet.has(chatId);
                const existing = await readChat<Chat>(chatId);
                if (!existing) {
                    const chat: Chat = {
                        id: chatId,
                        established: true,
                        createdAt: 0,
                        lefted,
                    };
                    await saveChat(chat);
                    chats.value.push(chat);
                } else if (
                    !existing.established ||
                    !!existing.lefted !== lefted
                ) {
                    const updated = { ...existing, established: true, lefted };
                    await saveChat(updated);
                    const idx = chats.value.findIndex((c) => c.id === chatId);
                    if (idx !== -1) chats.value[idx] = updated;
                    else chats.value.push(updated);
                }
            }
        });

        // Второй участник удалил чат для всех — чистим локально.
        subscribe("chat_destroyed", async (msg) => {
            await cleanupChat(msg.payload.chatId);
        });

        // Второй участник покинул чат — переводим в read-only.
        subscribe("chat_deleted", async (msg) => {
            await markChatLefted(msg.payload.chatId);
        });
    }

    async function createChat(): Promise<Chat> {
        const chatId = nanoid(8);
        const hostKey = await exportSignPublicKey();
        const appOrigin =
            import.meta.env.VITE_APP_ORIGIN ?? window.location.origin;
        const joinLink = `${appOrigin}/app/join/${chatId}#key=${hostKey}`;

        const chat: Chat = {
            id: chatId,
            established: false,
            joinLink,
            createdAt: Date.now(),
        };

        await saveChat(chat);
        chats.value.push(chat);

        wsSend({ type: "init_chat", payload: { chatId } });

        return chat;
    }

    async function knockChat(chatId: string, hostKey: string): Promise<void> {
        const peerInfo = await getMyPeerInfo();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        wsSend({
            type: "knock_chat",
            payload: { chatId, hostKey, peerInfo, timezone },
        });
    }

    async function approveChat(chatId: string): Promise<void> {
        const knock = pendingKnocks.value.find((k) => k.chatId === chatId);

        if (knock) {
            await savePeer(toRaw(knock.peerInfo), chatId);
        }

        const peerInfo = await getMyPeerInfo();

        wsSend({ type: "approve_chat", payload: { chatId, peerInfo } });

        await removeKnock(chatId);
    }

    async function cleanupChat(chatId: string): Promise<void> {
        await Promise.all([
            removeChat(chatId),
            removePeer(chatId),
            removeAllByChat(chatId),
        ]);

        chats.value = chats.value.filter((c) => c.id !== chatId);

        if (activeChatId.value === chatId) {
            activeChatId.value = null;
            router.push("/app");
        }
    }

    // Собеседник покинул чат (удалил у себя): чат остаётся, но становится read-only.
    async function markChatLefted(chatId: string): Promise<void> {
        const existing = await readChat<Chat>(chatId);
        if (!existing) return;
        const updated: Chat = { ...existing, lefted: true };
        await saveChat(updated);
        const idx = chats.value.findIndex((c) => c.id === chatId);
        if (idx !== -1) chats.value[idx] = updated;
    }

    async function cancelPendingChat(chatId: string): Promise<void> {
        wsSend({ type: "cancel_chat", payload: { chatId } });
        await cleanupChat(chatId);
    }

    // Удаление только у себя: снимаем членство на сервере и полностью чистим
    // локально (чат, сообщения, ключи пира). Второму участнику сервер пришлёт
    // chat_deleted, и у него чат станет read-only.
    async function deleteChat(chatId: string): Promise<void> {
        wsSend({ type: "delete_chat", payload: { chatId } });
        await cleanupChat(chatId);
    }

    // Удаление для обоих: сервер снесёт данные и уведомит второго участника.
    async function deleteChatForAll(chatId: string): Promise<void> {
        wsSend({ type: "delete_chat_for_all", payload: { chatId } });
        await cleanupChat(chatId);
    }

    return {
        chats,
        pendingKnocks,
        loadChats,
        startSync,
        createChat,
        knockChat,
        approveChat,
        deleteChat,
        deleteChatForAll,
        cancelPendingChat,
    };
}
