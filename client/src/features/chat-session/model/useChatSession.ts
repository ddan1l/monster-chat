import { ref, watch, nextTick } from "vue";

import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWsChannel } from "@shared/transport/useWsChannel";

import { chats } from "@entities/chat/useChats";
import { type DecryptedMessage } from "@entities/message/useMessages";
import { useOutbox } from "@entities/message/useOutbox";
import { usePeerPresence } from "@entities/peer/usePeerPresence";
import { peers } from "@entities/peer/usePeers";
import { useUser } from "@entities/user/useUser";

import { useChatCrypto } from "./useChatCrypto";
import { useMessageWindow } from "./useMessageWindow";
import { useTypingIndicator } from "./useTypingIndicator";

import type {
    Chat,
    MessageContent,
    MessageAction,
    FileAttachment,
    PeerInfo,
    ReplyRef,
} from "shared";

export type { DecryptedMessage };
export type { ScrollTarget } from "./useMessageWindow";

// Оркестратор сессии чата: связывает окно сообщений (useMessageWindow), крипту
// (useChatCrypto), typing/presence и WS-события. Сам почти не держит состояния —
// доменная логика окна и отправки живёт в специализированных композаблах.
export function useChatSession(chatId: string) {
    const { read } = useIndexedDb(STORES.CHATS);
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { enqueue: enqueueOutbox } = useOutbox();
    const { user, load: loadUser } = useUser();
    const { send: wsSend, connected, on, track } = useWsChannel();

    const { initPeer, loadMyKey, getMyKey, ready, decryptV2, buildBundle } =
        useChatCrypto(chatId);
    const { isPeerTyping, sendTyping, sendStopTyping } =
        useTypingIndicator(chatId);
    const { isPeerOnline, peerLastSeen } = usePeerPresence(chatId);

    const mw = useMessageWindow(chatId);
    const { messages, hasMoreMessages, hasMoreBelow, scrollTarget, pinned } =
        mw;

    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const error = ref<string | null>(null);

    // --- Отправка / действия ---

    async function sendMessage(
        text: string,
        files?: FileAttachment[],
        originalNonce?: string,
        replyTo?: ReplyRef
    ): Promise<void> {
        if (!user.value || !peer.value || !ready()) {
            return;
        }
        const content: MessageContent = {
            text,
            ...(files?.length ? { files: files.map((f) => ({ ...f })) } : {}),
            ...(originalNonce
                ? { action: "edit_message", targetNonce: originalNonce }
                : {}),
            ...(replyTo ? { replyTo } : {}),
        };
        // v2 (FS): бандл с per-device копиями (ECIES под prekey каждого).
        const bundle = await buildBundle(content, !!originalNonce);
        if (!content.action) {
            // Кладём в outbox до ACK и оптимистично показываем как pending. Свою
            // копию храним локально: транспортных iv/payload у бандла нет, контент
            // уходит в store под ключом устройства (см. saveChatMessage).
            await enqueueOutbox(chatId, bundle);
            mw.addMessage({
                chatId: bundle.chatId,
                from: bundle.from,
                to: bundle.to,
                nonce: bundle.nonce,
                iv: "",
                payload: "",
                signature: "",
                timestamp: bundle.timestamp,
                ...content,
                isOwn: true,
                isRead: false,
                status: "pending",
            });
        }
        wsSend({ type: "message_bundle", payload: bundle });
    }

    async function editMessage(nonce: string, newText: string): Promise<void> {
        await sendMessage(newText, undefined, nonce);
        // Контент под ключом устройства пересобирается в saveChatMessage —
        // достаточно обновить text.
        mw.updateMessage(nonce, { text: newText, editedAt: Date.now() });
    }

    async function sendAction(
        action: MessageAction,
        targetNonce?: string,
        extra?: Partial<MessageContent>
    ): Promise<void> {
        if (!peer.value || !ready()) {
            return;
        }
        const content: MessageContent = {
            action,
            ...(targetNonce ? { targetNonce } : {}),
            ...extra,
        };
        // Действия (read/edit/delete/reaction) тоже v2: веером на все устройства.
        const bundle = await buildBundle(content, true);
        wsSend({ type: "message_bundle", payload: bundle });
    }

    // Тоггл эмодзи-реакции: применяем локально и шлём silent-экшен собеседнику
    // (и на свои устройства). Реакции — по тому же зашифрованному каналу.
    async function toggleReaction(nonce: string, emoji: string): Promise<void> {
        const myKey = getMyKey();
        if (!myKey || !peer.value || !ready()) {
            return;
        }
        const removed = mw.toggleReaction(nonce, emoji, myKey);
        await sendAction("reaction", nonce, {
            emoji,
            ...(removed ? { remove: true } : {}),
        });
    }

    async function markAsRead(nonce: string): Promise<void> {
        // Квитанция о прочтении идёт по зашифрованному и подписанному каналу
        // action'ов — сервер её содержимое не видит.
        await sendAction("read_message", nonce);
        mw.updateMessage(nonce, { isRead: true });
    }

    async function deleteMessageForMe(nonce: string): Promise<void> {
        await mw.removeMessage(nonce);
    }

    async function deleteMessageForAll(nonce: string): Promise<void> {
        await sendAction("delete_message", nonce);
        await mw.removeMessage(nonce);
    }

    // --- WS-проводка ---

    async function connect(): Promise<void> {
        on("error", (msg) => {
            error.value = msg.message;
        });

        // ACK сервера — помечаем исходящее доставленным.
        on("ack", (msg) => {
            mw.updateMessage(msg.payload.nonce, {
                status: "sent",
                seq: msg.payload.seq,
            });
        });

        on("message", async (msg) => {
            // Replay-защита: отбрасываем уже виденные nonce.
            const { nonce } = msg.payload;
            if (mw.hasSeen(nonce)) {
                return;
            }
            mw.markSeen(nonce);

            // Расшифровываем копию эпохальным ключом устройства.
            const decrypted = await decryptV2(msg.payload);
            if (decrypted.decryptError) {
                // Провал подписи/расшифровки в стор НЕ пишем — показываем
                // транзитно; при следующей синхронизации попробуем снова.
                mw.pushTransient(decrypted);
                return;
            }
            if (decrypted.action === "edit_message" && decrypted.targetNonce) {
                mw.applyEdit(decrypted);
            } else if (
                decrypted.action === "delete_message" &&
                decrypted.targetNonce
            ) {
                await mw.removeMessage(decrypted.targetNonce);
            } else if (
                decrypted.action === "read_message" &&
                decrypted.targetNonce
            ) {
                mw.updateMessage(decrypted.targetNonce, { isRead: true });
            } else if (
                decrypted.action === "reaction" &&
                decrypted.targetNonce &&
                decrypted.emoji
            ) {
                mw.applyReaction(
                    decrypted.from,
                    decrypted.targetNonce,
                    decrypted.emoji,
                    !!decrypted.remove
                );
            } else {
                mw.addMessage(decrypted);
            }
        });

        track(
            watch(
                () => peers.value[chatId],
                async (peerInfo) => {
                    if (!peerInfo) {
                        return;
                    }
                    peer.value = peerInfo;
                    await initPeer(peerInfo);
                }
            )
        );

        if (!user.value) {
            await loadUser();
        }

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

        track(
            watch(
                () => chats.value.find((c) => c.id === chatId)?.established,
                (established) => {
                    if (established) {
                        loadChat();
                    }
                },
                { immediate: true }
            )
        );

        track(
            watch(connected, async (isConnected, wasConnected) => {
                if (isConnected && wasConnected === false) {
                    await nextTick();
                    loadChat();
                }
            })
        );
    }

    // Открывает чат: подтягивает собеседника/крипту, грузит окно из IDB и синкает
    // пропущенное с сервера по seq-курсору.
    async function loadChat(): Promise<void> {
        const activePeer = await readPeer<PeerInfo>(chatId);
        chat.value = chats.value.find((c) => c.id === chatId) ?? null;
        peer.value = activePeer;
        if (activePeer) {
            await initPeer(activePeer);
        }
        const afterSeq = await mw.loadLastPage();
        if (connected.value) {
            // Курсор — серверный монотонный seq, а не клиентский timestamp.
            wsSend({ type: "open_chat", payload: { chatId, afterSeq } });
        }
        mw.loadPinned();
    }

    return {
        chat,
        peer,
        isPeerOnline,
        peerLastSeen,
        isPeerTyping,
        messages,
        hasMoreMessages,
        hasMoreBelow,
        scrollTarget,
        pinned,
        error,
        connect,
        loadMoreMessages: mw.loadMoreMessages,
        loadMoreBelow: mw.loadMoreBelow,
        jumpToDate: mw.jumpToDate,
        jumpToLatest: mw.jumpToLatest,
        jumpToMessage: mw.jumpToMessage,
        togglePin: mw.togglePin,
        toggleReaction,
        messageDays: mw.messageDays,
        sendMessage,
        editMessage,
        markAsRead,
        sendTyping,
        sendStopTyping,
        deleteMessageForMe,
        deleteMessageForAll,
    };
}
