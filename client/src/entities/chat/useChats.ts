import { ref, toRaw } from "vue";
import { nanoid } from "nanoid";
import type { Chat, PeerInfo } from "shared";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useChatMessages } from "@entities/message/useMessages";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useUser } from "@entities/user/useUser";
import { useWs } from "@shared/api/useWs";
import { useRouter } from "vue-router";

export interface PendingKnock {
    chatId: string;
    peerInfo: PeerInfo;
}

export const chats = ref<Chat[]>([]);
export const pendingKnocks = ref<PendingKnock[]>([]);
export const activeChatId = ref<string | null>(null);

export function useChats() {
    const {
        readAll,
        write: saveChat,
        read,
        remove: removeChat,
    } = useIndexedDb(STORES.CHATS);
    const { write: savePeer, remove: removePeer } = useIndexedDb(STORES.PEERS);
    const {
        write: saveKnock,
        readAll: readAllKnocks,
        remove: removeKnock,
    } = useIndexedDb(STORES.PENDING_KNOCKS);
    const { user, load: loadUser } = useUser();
    const { send: wsSend, subscribe } = useWs();
    const { exportSignPublicKey, exportEncryptionPublicKey } = useCrypto();
    const { removeAllByChat } = useChatMessages();
    const router = useRouter();

    async function loadChats(): Promise<void> {
        chats.value = await readAll<Chat>();
    }

    async function loadPendingKnocks(): Promise<void> {
        pendingKnocks.value = await readAllKnocks<PendingKnock>();
    }

    function startSync(): void {
        loadPendingKnocks();

        subscribe("chat_created", async (msg) => {
            const { chatId } = msg.payload;
            const existing = await read<Chat>(chatId);

            const updated: Chat = existing
                ? { ...existing, isActive: true }
                : { id: chatId, isActive: true, createdAt: Date.now() };

            await saveChat(updated);

            const idx = chats.value.findIndex((c) => c.id === chatId);
            if (idx !== -1) chats.value[idx] = updated;
            else chats.value.push(updated);
        });

        subscribe("peer_info", async (msg) => {
            const { chatId, ...peerInfo } = msg.payload;
            await savePeer(peerInfo, chatId);
        });

        subscribe("chat_knock", async (msg) => {
            const { chatId, peerInfo } = msg.payload;
            const alreadyKnocking = pendingKnocks.value.some(
                (k) => k.chatId === chatId
            );
            if (!alreadyKnocking) {
                const knock: PendingKnock = { chatId, peerInfo };
                await saveKnock(knock, chatId);
                pendingKnocks.value.push(knock);
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

    async function exportMyKeys() {
        if (!user.value) await loadUser();
        const [signPubKey, ecdhPubKey] = await Promise.all([
            exportSignPublicKey(),
            exportEncryptionPublicKey(),
        ]);
        return { signPubKey, ecdhPubKey, name: user.value!.name, avatar: user.value!.avatar };
    }

    async function knockChat(chatId: string, hostKey: string): Promise<void> {
        const peerInfo = await exportMyKeys();
        wsSend({ type: "knock_chat", payload: { chatId, hostKey, peerInfo } });
    }

    async function approveChat(chatId: string): Promise<void> {
        const knock = pendingKnocks.value.find((k) => k.chatId === chatId);
        if (knock) {
            await savePeer(toRaw(knock.peerInfo), chatId);
        }
        const peerInfo = await exportMyKeys();
        wsSend({ type: "approve_chat", payload: { chatId, peerInfo } });
        await removeKnock(chatId);
        pendingKnocks.value = pendingKnocks.value.filter(
            (k) => k.chatId !== chatId
        );
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

    async function deleteChatForAll(chatId: string): Promise<void> {
        wsSend({ type: "delete_chat", payload: { chatId } });
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
        deleteChatForMe: cleanupChat,
        deleteChatForAll,
    };
}
