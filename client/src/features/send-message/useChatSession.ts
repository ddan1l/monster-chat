import { ref, watch, onUnmounted, toRaw } from "vue";
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
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useCrypto, fromBase64, toBase64 } from "@shared/crypto/useCrypto";
import { useChatMessages, type DecryptedMessage } from "@entities/message/useMessages";
import { useUser } from "@entities/user/useUser";
import { useWs } from "@shared/api/useWs";
import { chats } from "@entities/chat/useChats";

export type { DecryptedMessage };

export function useChatSession(chatId: string, onChatDeleted?: () => void) {
    const { read } = useIndexedDb(STORES.CHATS);
    const { read: readPeer, write: writePeer } = useIndexedDb(STORES.PEERS);
    const { saveChatMessage, getByChat, removeChatMessage } = useChatMessages();
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

    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const messages = ref<DecryptedMessage[]>([]);
    const error = ref<string | null>(null);
    const isPeerOnline = ref(false);
    const peerLastSeen = ref<number | null>(null);
    const isPeerTyping = ref(false);

    let sharedKey: CryptoKey | null = null;
    let typingTimer: ReturnType<typeof setTimeout> | null = null;
    let peerTypingTimer: ReturnType<typeof setTimeout> | null = null;
    let isTypingSent = false;

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
        const valid = await verify(
            fromBase64(msg.from),
            envelopeBytes,
            fromBase64(msg.signature)
        );

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
        };
    }

    function addMessage(msg: DecryptedMessage): void {
        saveChatMessage(msg);
        messages.value.push(msg);
    }

    function updateMessage(nonce: string, updates: Partial<DecryptedMessage>): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx === -1) return;
        const updated: DecryptedMessage = { ...toRaw(messages.value[idx]), ...updates };
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
        if (!user.value || !peer.value || !sharedKey) return;

        const content: MessageContent = {
            text,
            ...(files?.length ? { files: files.map((f) => ({ ...f })) } : {}),
            ...(originalNonce
                ? { action: "edit_message", targetNonce: originalNonce }
                : {}),
        };
        const nonce = crypto.randomUUID();
        const { payload, iv } = await encrypt(
            sharedKey,
            JSON.stringify(content)
        );
        const from = await exportSignPublicKey();

        const envelope: ChatEnvelope = {
            chatId,
            from,
            to: peer.value.signPubKey,
            nonce,
            iv: toBase64(iv),
            payload: toBase64(payload),
            timestamp: Date.now(),
        };

        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const signature = await sign(envelopeBytes);

        const msg: ChatMessage = {
            ...envelope,
            signature: toBase64(signature),
            ...(originalNonce ? { isAction: true } : {}),
        };

        wsSend({ type: "message", payload: msg });
        if (!content.action) {
            addMessage({ ...msg, ...content });
        }
    }

    async function editMessage(nonce: string, newText: string): Promise<void> {
        await sendMessage(newText, undefined, nonce);
        updateMessage(nonce, { text: newText, editedAt: Date.now() });
    }

    async function markAsRead(nonce: string): Promise<void> {
        wsSend({ type: "read_receipt", payload: { chatId, nonce } });
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
        const nonce = crypto.randomUUID();
        const { payload, iv } = await encrypt(
            sharedKey,
            JSON.stringify(content)
        );
        const from = await exportSignPublicKey();
        const envelope: ChatEnvelope = {
            chatId,
            from,
            to: peer.value.signPubKey,
            nonce,
            iv: toBase64(iv),
            payload: toBase64(payload),
            timestamp: Date.now(),
        };
        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const signature = await sign(envelopeBytes);
        wsSend({
            type: "message",
            payload: {
                ...envelope,
                signature: toBase64(signature),
                isAction: true,
            },
        });
    }

    async function deleteMessageForAll(nonce: string): Promise<void> {
        await sendAction("delete_message", nonce);
        await removeChatMessage(nonce);
        removeMessageFromUI(nonce);
    }

    async function sendTyping(): Promise<void> {
        const from = await exportSignPublicKey();
        if (!isTypingSent) {
            wsSend({ type: "typing", payload: { chatId, from } });
            isTypingSent = true;
        }
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(async () => {
            wsSend({ type: "stop_typing", payload: { chatId, from } });
            isTypingSent = false;
            typingTimer = null;
        }, 2000);
    }

    async function sendStopTyping(): Promise<void> {
        if (!isTypingSent) return;
        const from = await exportSignPublicKey();
        wsSend({ type: "stop_typing", payload: { chatId, from } });
        isTypingSent = false;
        if (typingTimer) {
            clearTimeout(typingTimer);
            typingTimer = null;
        }
    }

    async function connect(): Promise<void> {
        on("error", (msg) => {
            error.value = msg.message;
        });

        on("message", async (msg) => {
            const decrypted = await decryptMessage(msg.payload);
            if (decrypted.action === "edit_message" && decrypted.targetNonce) {
                applyEdit(decrypted);
            } else if (
                decrypted.action === "delete_message" &&
                decrypted.targetNonce
            ) {
                await removeChatMessage(decrypted.targetNonce);
                removeMessageFromUI(decrypted.targetNonce);
            } else if (decrypted.action === "delete_chat") {
                onChatDeleted?.();
            } else {
                addMessage(decrypted);
            }
        });

        on("read_receipt", (msg) => {
            updateMessage(msg.payload.nonce, { isRead: true });
        });

        on("peer_typing", (msg) => {
            if (msg.payload.chatId !== chatId) return;
            isPeerTyping.value = true;
            if (peerTypingTimer) clearTimeout(peerTypingTimer);
            peerTypingTimer = setTimeout(() => {
                isPeerTyping.value = false;
            }, 3000);
        });

        on("peer_stop_typing", (msg) => {
            if (msg.payload.chatId !== chatId) return;
            isPeerTyping.value = false;
            if (peerTypingTimer) {
                clearTimeout(peerTypingTimer);
                peerTypingTimer = null;
            }
        });

        on("peer_online", (msg) => {
            if (msg.payload.chatId === chatId) {
                isPeerOnline.value = true;
                peerLastSeen.value = null;
            }
        });

        on("peer_offline", (msg) => {
            if (msg.payload.chatId === chatId) {
                isPeerOnline.value = false;
                peerLastSeen.value = Date.now();
            }
        });

        on("peer_info", async (msg) => {
            const { chatId: msgChatId, ...peerInfo } = msg.payload;
            if (msgChatId !== chatId) return;

            const stored = await readPeer<{
                signPubKey: string;
                verified?: boolean;
                keyChanged?: boolean;
            }>(chatId);
            if (stored && stored.signPubKey !== peerInfo.signPubKey) {
                await writePeer(
                    { ...peerInfo, verified: false, keyChanged: true },
                    chatId
                );
            }

            peer.value = peerInfo;
            await initSharedKey(peerInfo.ecdhPubKey);
        });

        if (!user.value) await loadUser();

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
                async (isActive) => {
                    if (!isActive) return;

                    const [signPubKey, msgs, activePeer] = await Promise.all([
                        exportSignPublicKey(),
                        getByChat(chatId),
                        readPeer<PeerInfo>(chatId),
                    ]);

                    chat.value =
                        chats.value.find((c) => c.id === chatId) ?? null;
                    peer.value = activePeer;

                    if (activePeer) await initSharedKey(activePeer.ecdhPubKey);

                    messages.value = await Promise.all(
                        msgs.map(decryptMessage)
                    );

                    wsSend({
                        type: "open_chat",
                        payload: { chatId, signPubKey },
                    });
                },
                { immediate: true }
            )
        );
    }

    return {
        chat,
        peer,
        isPeerOnline,
        peerLastSeen,
        isPeerTyping,
        messages,
        error,
        connect,
        sendMessage,
        editMessage,
        markAsRead,
        sendTyping,
        sendStopTyping,
        deleteMessageForMe,
        deleteMessageForAll,
        deleteChatForAll: () => sendAction("delete_chat"),
    };
}
