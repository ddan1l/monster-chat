import { ref, watch, onUnmounted, toRaw, nextTick } from "vue";

import { useWs } from "@shared/api/useWs";
import { useCrypto, fromBase64, toBase64 } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

import { chats } from "@entities/chat/useChats";
import {
    useChatMessages,
    PAGE_SIZE,
    type DecryptedMessage,
} from "@entities/message/useMessages";
import { usePeerPresence } from "@entities/peer/usePeerPresence";
import { peers } from "@entities/peer/usePeers";
import { useUser } from "@entities/user/useUser";

import { useTypingIndicator } from "./useTypingIndicator";

import type {
    Chat,
    ChatEnvelope,
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
    const { saveChatMessage, getLastPage, getPageBefore, removeChatMessage } =
        useChatMessages();
    const { user, load: loadUser } = useUser();
    const { send: wsSend, subscribe } = useWs();
    const {
        exportSignPublicKey,
        deriveSharedKey,
        encrypt,
        decrypt,
        sign,
        verify,
    } = useCrypto();

    const { connected } = useWs();
    const { isPeerTyping, sendTyping, sendStopTyping } =
        useTypingIndicator(chatId);

    const { isPeerOnline, peerLastSeen } = usePeerPresence(chatId);

    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const messages = ref<DecryptedMessage[]>([]);
    const hasMoreMessages = ref(false);
    const error = ref<string | null>(null);

    let sharedKey: CryptoKey | null = null;
    let myKey: string | null = null;
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

    async function initSharedKey(ecdhPubKey: string): Promise<void> {
        sharedKey = await deriveSharedKey(fromBase64(ecdhPubKey));
    }

    async function decryptMessage(msg: ChatMessage): Promise<DecryptedMessage> {
        const envelope: ChatEnvelope = {
            chatId: msg.chatId,
            from: msg.from,
            to: msg.to,
            nonce: msg.nonce,
            iv: msg.iv,
            payload: msg.payload,
            timestamp: msg.timestamp,
        };

        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );

        // Отправителем может быть только один из двух участников чата —
        // мы сами (загрузка своей истории) или доверенный пир. Любой иной
        // ключ означает попытку выдать себя за участника.
        const trustedSender =
            msg.from === myKey || msg.from === peer.value?.signPubKey;

        const valid =
            trustedSender &&
            (await verify(
                fromBase64(msg.from),
                envelopeBytes,
                fromBase64(msg.signature)
            ));

        if (!valid) {
            return { ...msg, text: "<i>Invalid message signature</i>" };
        }
        if (!sharedKey) {
            throw new Error("Shared key not initialized");
        }

        const decrypted = await decrypt(
            sharedKey,
            fromBase64(msg.payload),
            new Uint8Array(fromBase64(msg.iv))
        );

        const content: MessageContent = JSON.parse(decrypted);
        const stored = msg as DecryptedMessage;
        return {
            ...msg,
            ...content,
            // Restore persisted metadata when loading from IDB
            ...(stored.editedAt !== undefined
                ? { editedAt: stored.editedAt, text: stored.text }
                : {}),
            ...(stored.isRead !== undefined ? { isRead: stored.isRead } : {}),
            ...(stored.isOwn !== undefined ? { isOwn: stored.isOwn } : {}),
        };
    }

    function addMessage(msg: DecryptedMessage): void {
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

    async function buildSignedMessage(
        content: MessageContent,
        isAction?: boolean
    ): Promise<ChatMessage> {
        const nonce = crypto.randomUUID();
        const { payload, iv } = await encrypt(
            sharedKey!,
            JSON.stringify(content)
        );
        const from = await exportSignPublicKey();
        const envelope: ChatEnvelope = {
            chatId,
            from,
            to: peer.value!.signPubKey,
            nonce,
            iv: toBase64(iv),
            payload: toBase64(payload),
            timestamp: Date.now(),
        };
        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const signature = await sign(envelopeBytes);
        return {
            ...envelope,
            signature: toBase64(signature),
            ...(isAction ? { isAction: true } : {}),
        };
    }

    async function sendMessage(
        text: string,
        files?: FileAttachment[],
        originalNonce?: string
    ): Promise<void> {
        if (!user.value || !peer.value || !sharedKey) return;

        const content: MessageContent = {
            text,
            ...(files?.length ? { files: files.map((f) => ({ ...f })) } : {}),
            ...(originalNonce
                ? { action: "edit_message", targetNonce: originalNonce }
                : {}),
        };
        const msg = await buildSignedMessage(content, !!originalNonce);
        wsSend({ type: "message", payload: msg });
        if (!content.action) {
            addMessage({ ...msg, ...content, isOwn: true, isRead: false });
        }
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
        if (!peer.value || !sharedKey) return;
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

        on("message", async (msg) => {
            // Replay-защита: отбрасываем уже виденные nonce и сообщения
            // с временной меткой вне допустимого окна.
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
                    await initSharedKey(peerInfo.ecdhPubKey);
                }
            )
        );

        if (!user.value) await loadUser();

        myKey = await exportSignPublicKey();

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
                () => chats.value.find((c) => c.id === chatId)?.isActive,
                (isActive) => {
                    if (isActive) loadChat();
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
        const [signPubKey, msgs, activePeer] = await Promise.all([
            exportSignPublicKey(),
            getLastPage(chatId),
            readPeer<PeerInfo>(chatId),
        ]);
        chat.value = chats.value.find((c) => c.id === chatId) ?? null;
        peer.value = activePeer;
        if (activePeer) await initSharedKey(activePeer.ecdhPubKey);
        messages.value = await Promise.all(msgs.map(decryptMessage));
        hasMoreMessages.value = msgs.length === PAGE_SIZE;
        if (connected.value) {
            wsSend({ type: "open_chat", payload: { chatId, signPubKey } });
        }
    }

    async function loadMoreMessages(): Promise<void> {
        if (!hasMoreMessages.value || messages.value.length === 0) return;
        const oldest = messages.value[0].timestamp;
        const older = await getPageBefore(chatId, oldest);
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
