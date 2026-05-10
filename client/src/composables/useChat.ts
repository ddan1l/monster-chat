import { ref, watch, onUnmounted, toRaw } from "vue";
import { nanoid } from "nanoid";
import type { Chat, ChatMessage, PeerInfo } from "shared";
import { useIndexedDb, STORES } from "./useIndexedDb";
import { useCrypto } from "./useCrypto";
import { useChatMessages } from "./useMessages";
import { useUser } from "./useUser";
import { useWs } from "./useWs";

interface PendingKnock {
    chatId: string;
    peerInfo: PeerInfo;
}

const chats = ref<Chat[]>([]);
const pendingKnocks = ref<PendingKnock[]>([]);

export function useChat(chatId?: string) {
    const { readAll, write: saveChat, read } = useIndexedDb(STORES.CHATS);

    const { saveChatMessage, getByChat } = useChatMessages();
    const { user, load: loadUser } = useUser();
    const { send: wsSend, subscribe } = useWs();
    const { exportSignPublicKey, exportEncryptionPublicKey } = useCrypto();
    const { write: savePeer, read: readPeer } = useIndexedDb(STORES.PEERS);
    const {
        write: saveKnock,
        readAll: readAllKnocks,
        remove: removeKnock,
    } = useIndexedDb(STORES.PENDING_KNOCKS);

    const error = ref<string | null>(null);
    const messages = ref<ChatMessage[]>([]);
    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const unsubs: (() => void)[] = [];
    const on: typeof subscribe = (type, handler) => {
        const unsub = subscribe(type, handler);
        unsubs.push(unsub);
        return unsub;
    };

    onUnmounted(() => unsubs.forEach((fn) => fn()));

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

    async function knockChat(chatId: string, hostKey: string): Promise<void> {
        if (!user.value) await loadUser();
        const [signPubKey, ecdhPubKey] = await Promise.all([
            exportSignPublicKey(),
            exportEncryptionPublicKey(),
        ]);
        wsSend({
            type: "knock_chat",
            payload: {
                chatId,
                hostKey,
                peerInfo: {
                    signPubKey,
                    ecdhPubKey,
                    name: user.value!.name,
                    avatar: user.value!.avatar,
                },
            },
        });
    }

    async function approveChat(chatId: string): Promise<void> {
        const knock = pendingKnocks.value.find((k) => k.chatId === chatId);
        if (knock) {
            await savePeer(toRaw(knock.peerInfo), chatId);
        }
        if (!user.value) await loadUser();
        const [signPubKey, ecdhPubKey] = await Promise.all([
            exportSignPublicKey(),
            exportEncryptionPublicKey(),
        ]);
        wsSend({
            type: "approve_chat",
            payload: {
                chatId,
                peerInfo: {
                    signPubKey,
                    ecdhPubKey,
                    name: user.value!.name,
                    avatar: user.value!.avatar,
                },
            },
        });
        await removeKnock(chatId);
        pendingKnocks.value = pendingKnocks.value.filter(
            (k) => k.chatId !== chatId
        );
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

        wsSend({
            type: "init_chat",
            payload: { chatId, hostKey: hostKey },
        });

        return chat;
    }

    async function connectChat() {
        if (!chatId) return;

        on("error", (msg) => {
            error.value = msg.message;
        });

        on("message", (msg) => {
            addMessage(msg.payload);
        });

        on("peer_info", (msg) => {
            const { chatId: msgChatId, ...peerInfo } = msg.payload;
            if (msgChatId === chatId) {
                peer.value = peerInfo;
            }
        });

        if (!user.value) await loadUser();

        const loadedChat = await read<Chat>(chatId);
        chat.value = loadedChat;
        peer.value = await readPeer<PeerInfo>(chatId);

        if (loadedChat && !chats.value.find((c) => c.id === chatId)) {
            chats.value.push(loadedChat);
        }

        unsubs.push(
            watch(
                () => chats.value.find((c) => c.id === chatId)?.isActive,
                async (isActive) => {
                    if (!isActive) return;
                    const [signPubKey, msgs, loadedPeer] = await Promise.all([
                        exportSignPublicKey(),
                        getByChat(chatId!),
                        readPeer<PeerInfo>(chatId!),
                    ]);
                    chat.value =
                        chats.value.find((c) => c.id === chatId) ?? null;
                    messages.value = msgs;
                    peer.value = loadedPeer;
                    wsSend({
                        type: "open_chat",
                        payload: { chatId: chatId!, signPubKey },
                    });
                },
                { immediate: true }
            )
        );
    }

    function addMessage(msg: ChatMessage) {
        saveChatMessage(msg);
        messages.value.push(msg);
    }

    async function sendMessage(text: string) {
        if (!chatId || !user.value || !peer.value) {
            return;
        }

        // const nonce = nanoid();
        // const { payload, iv } = await encrypt(
        //     sharedKey,
        //     JSON.stringify(message)
        // );

        const from = await exportSignPublicKey();

        const msg: ChatMessage = {
            id: nanoid(),
            chatId,
            from,
            to: peer.value!.signPubKey,
            text,
            timestamp: Date.now(),
        };

        wsSend({ type: "message", payload: msg });
        addMessage(msg);
    }

    return {
        chats,
        chat,
        peer,
        pendingKnocks,
        loadChats,
        createChat,
        knockChat,
        approveChat,
        startSync,
        error,
        messages,
        connectChat,
        sendMessage,
    };
}
// function encrypt(
//     sharedKey: any,
//     arg1: string
// ): { payload: any; iv: any } | PromiseLike<{ payload: any; iv: any }> {
//     throw new Error("Function not implemented.");
// }
