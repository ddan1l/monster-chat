import { ref, watch, onUnmounted, toRaw, nextTick } from "vue";

import { signRequest } from "@shared/crypto/signRequest";
import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { chats } from "@entities/chat/useChats";
import {
    useChatMessages,
    PAGE_SIZE,
    type DecryptedMessage,
} from "@entities/message/useMessages";
import { useOutbox } from "@entities/message/useOutbox";
import { usePeerPresence } from "@entities/peer/usePeerPresence";
import { peers } from "@entities/peer/usePeers";
import { useUser } from "@entities/user/useUser";

import { useChatCrypto } from "./useChatCrypto";
import { useTypingIndicator } from "./useTypingIndicator";

import type {
    Chat,
    ChatMessage,
    MessageContent,
    MessageAction,
    FileAttachment,
    PeerInfo,
    ServerMessage,
} from "shared";

export type { DecryptedMessage };

export function useChatSession(chatId: string) {
    const { read } = useIndexedDb(STORES.CHATS);
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { saveChatMessage, getLastPage, removeChatMessage, trimToLastPage } =
        useChatMessages();
    const { enqueue: enqueueOutbox } = useOutbox();
    const { user, load: loadUser } = useUser();
    const { send: wsSend, subscribe, connected } = useWs();

    const { initPeer, loadMyKey, ready, decryptMessage, buildSignedMessage } =
        useChatCrypto(chatId);

    const { isPeerTyping, sendTyping, sendStopTyping } =
        useTypingIndicator(chatId);
    const { isPeerOnline, peerLastSeen } = usePeerPresence(chatId);

    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const messages = ref<DecryptedMessage[]>([]);
    const hasMoreMessages = ref(false);
    const error = ref<string | null>(null);

    const seenNonces = new Set<string>();

    const unsubs: (() => void)[] = [];
    function on<T extends ServerMessage["type"]>(
        type: T,
        handler: (msg: Extract<ServerMessage, { type: T }>) => void
    ) {
        const unsub = subscribe(type, handler);
        unsubs.push(unsub);
        return unsub;
    }

    onUnmounted(() => unsubs.forEach((fn) => fn()));

    function addMessage(msg: DecryptedMessage): void {
        // Свои сообщения сервер вернёт и нам (getAfter по sender OR recipient) —
        // помечаем nonce, чтобы повторная загрузка не создала дубль.
        seenNonces.add(msg.nonce);
        saveChatMessage(msg);
        messages.value.push(msg);
    }

    function updateMessage(
        nonce: string,
        updates: Partial<DecryptedMessage>
    ): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx === -1) return;
        const updated: DecryptedMessage = {
            ...toRaw(messages.value[idx]),
            ...updates,
        };
        messages.value[idx] = updated;
        saveChatMessage(updated);
    }

    function applyEdit(edit: DecryptedMessage): void {
        if (!edit.targetNonce) return;
        const idx = messages.value.findIndex(
            (m) => m.nonce === edit.targetNonce
        );
        if (idx === -1) return;
        const updated: DecryptedMessage = {
            ...toRaw(messages.value[idx]),
            text: edit.text,
            editedAt: edit.timestamp,
        };
        messages.value[idx] = updated;
        saveChatMessage(updated);
    }

    async function sendMessage(
        text: string,
        files?: FileAttachment[],
        originalNonce?: string
    ): Promise<void> {
        if (!user.value || !peer.value || !ready()) return;

        const content: MessageContent = {
            text,
            ...(files?.length ? { files: files.map((f) => ({ ...f })) } : {}),
            ...(originalNonce
                ? { action: "edit_message", targetNonce: originalNonce }
                : {}),
        };
        const msg = await buildSignedMessage(content, !!originalNonce);
        if (!content.action) {
            // Кладём в outbox до ACK и оптимистично показываем как pending;
            // wsSend — попытка доставить сразу, флаш на реконнекте — гарантия.
            await enqueueOutbox(chatId, msg);
            addMessage({
                ...msg,
                ...content,
                isOwn: true,
                isRead: false,
                status: "pending",
            });
        }
        wsSend({ type: "message", payload: msg });
    }

    async function editMessage(nonce: string, newText: string): Promise<void> {
        await sendMessage(newText, undefined, nonce);
        updateMessage(nonce, { text: newText, editedAt: Date.now() });
    }

    async function markAsRead(nonce: string): Promise<void> {
        // Квитанция о прочтении идёт по зашифрованному и подписанному
        // каналу action'ов — сервер её содержимое не видит.
        await sendAction("read_message", nonce);
        updateMessage(nonce, { isRead: true });
    }

    function removeMessageFromUI(nonce: string): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx !== -1) messages.value.splice(idx, 1);
    }

    async function deleteMessageForMe(nonce: string): Promise<void> {
        await removeChatMessage(nonce);
        removeMessageFromUI(nonce);
    }

    async function sendAction(
        action: MessageAction,
        targetNonce?: string
    ): Promise<void> {
        if (!peer.value || !ready()) return;
        const content: MessageContent = {
            action,
            ...(targetNonce ? { targetNonce } : {}),
        };
        const msg = await buildSignedMessage(content, true);
        wsSend({ type: "message", payload: msg });
    }

    async function deleteMessageForAll(nonce: string): Promise<void> {
        await sendAction("delete_message", nonce);
        await removeChatMessage(nonce);
        removeMessageFromUI(nonce);
    }

    async function connect(): Promise<void> {
        on("error", (msg) => {
            error.value = msg.message;
        });

        // ACK сервера — помечаем исходящее доставленным (реактивно в открытом
        // чате; outbox глобально дочищает и обновляет IDB).
        on("ack", (msg) => {
            updateMessage(msg.payload.nonce, {
                status: "sent",
                seq: msg.payload.seq,
            });
        });

        on("message", async (msg) => {
            // Replay-защита: отбрасываем уже виденные nonce.
            const { nonce } = msg.payload;
            if (seenNonces.has(nonce)) return;
            seenNonces.add(nonce);

            const decrypted = await decryptMessage(msg.payload);
            if (decrypted.action === "edit_message" && decrypted.targetNonce) {
                applyEdit(decrypted);
            } else if (
                decrypted.action === "delete_message" &&
                decrypted.targetNonce
            ) {
                await removeChatMessage(decrypted.targetNonce);
                removeMessageFromUI(decrypted.targetNonce);
            } else if (
                decrypted.action === "read_message" &&
                decrypted.targetNonce
            ) {
                updateMessage(decrypted.targetNonce, { isRead: true });
            } else {
                addMessage(decrypted);
            }
        });

        unsubs.push(
            watch(
                () => peers.value[chatId],
                async (peerInfo) => {
                    if (!peerInfo) return;
                    peer.value = peerInfo;
                    await initPeer(peerInfo);
                }
            )
        );

        if (!user.value) await loadUser();

        await loadMyKey();

        const [loadedChat, loadedPeer] = await Promise.all([
            read<Chat>(chatId),
            readPeer<PeerInfo>(chatId),
        ]);
        chat.value = loadedChat;
        peer.value = loadedPeer;

        if (loadedChat && !chats.value.find((c) => c.id === chatId)) {
            chats.value.push(loadedChat);
        }

        unsubs.push(
            watch(
                () => chats.value.find((c) => c.id === chatId)?.established,
                (established) => {
                    if (established) loadChat();
                },
                { immediate: true }
            )
        );

        unsubs.push(
            watch(connected, async (isConnected, wasConnected) => {
                if (isConnected && wasConnected === false) {
                    await nextTick();
                    loadChat();
                }
            })
        );
    }

    async function loadChat(): Promise<void> {
        const [cached, activePeer] = await Promise.all([
            getLastPage(chatId),
            readPeer<PeerInfo>(chatId),
        ]);
        chat.value = chats.value.find((c) => c.id === chatId) ?? null;
        peer.value = activePeer;
        if (activePeer) await initPeer(activePeer);

        // Show cached messages immediately, pre-populate seenNonces to avoid duplicates
        messages.value = await Promise.all(cached.map(decryptMessage));
        cached.forEach((m) => seenNonces.add(m.nonce));
        hasMoreMessages.value = cached.length >= PAGE_SIZE;

        if (connected.value) {
            // Курсор — серверный монотонный seq, а не клиентский timestamp.
            const afterSeq = cached.reduce(
                (max, m) => Math.max(max, m.seq ?? 0),
                0
            );
            wsSend({
                type: "open_chat",
                payload: { chatId, afterSeq },
            });
        }
    }

    async function loadMoreMessages(): Promise<void> {
        if (!hasMoreMessages.value || messages.value.length === 0) return;
        const oldestSeq = messages.value[0].seq ?? 0;
        const wsUrl = import.meta.env.VITE_WS_URL as string;
        const apiBase = wsUrl.replace(/^ws(s?):\/\//, "http$1://");
        const url = `${apiBase}/api/messages/${chatId}?before=${oldestSeq}&limit=${PAGE_SIZE}`;

        const res = await fetch(url, {
            headers: await signRequest("GET", url),
        });
        if (!res.ok) return;
        const older: ChatMessage[] = await res.json();

        await Promise.all(older.map((m) => saveChatMessage(m)));
        await trimToLastPage(chatId);

        const decrypted = await Promise.all(older.map(decryptMessage));
        if (decrypted.length < PAGE_SIZE) hasMoreMessages.value = false;
        messages.value = [...decrypted, ...messages.value];
    }

    return {
        chat,
        peer,
        isPeerOnline,
        peerLastSeen,
        isPeerTyping,
        messages,
        hasMoreMessages,
        error,
        connect,
        loadMoreMessages,
        sendMessage,
        editMessage,
        markAsRead,
        sendTyping,
        sendStopTyping,
        deleteMessageForMe,
        deleteMessageForAll,
    };
}
