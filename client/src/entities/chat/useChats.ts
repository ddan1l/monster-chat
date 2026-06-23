import { ref, toRaw } from "vue";

import { nanoid } from "nanoid";
import { useRouter } from "vue-router";

import { useWs } from "@shared/api/useWs";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

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
                ? { ...existing, isActive: true }
                : { id: chatId, isActive: true, createdAt: Date.now() };

            await saveChat(updated);

            const index = chats.value.findIndex((c) => c.id === chatId);

            if (index !== -1) {
                chats.value[index] = updated;
            } else {
                chats.value.push(updated);
            }
        });
    }

    async function createChat(): Promise<Chat> {
        const chatId = nanoid(8);
        const hostKey = await exportSignPublicKey();
        const joinLink = `${window.location.origin}/join/${chatId}#key=${hostKey}`;

        const chat: Chat = {
            id: chatId,
            isActive: false,
            joinLink,
            createdAt: Date.now(),
        };

        await saveChat(chat);
        chats.value.push(chat);

        wsSend({ type: "init_chat", payload: { chatId, hostKey } });

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
            router.push("/");
        }
    }

    async function cancelPendingChat(chatId: string): Promise<void> {
        wsSend({ type: "cancel_chat", payload: { chatId } });
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
        deleteChat: cleanupChat,
        cancelPendingChat,
    };
}
