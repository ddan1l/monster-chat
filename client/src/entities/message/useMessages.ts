import { ref } from "vue";

import { useCrypto, toBase64, fromBase64 } from "@shared/crypto/useCrypto";
import {
    useIndexedDb,
    STORES,
    INDEX_CHAT_ID,
} from "@shared/storage/useIndexedDb";

import type { ChatMessage, MessageContent } from "shared";

export interface DecryptedMessage extends ChatMessage, MessageContent {
    editedAt?: number;
    isRead?: boolean;
    isOwn?: boolean;
    // Статус доставки исходящего сообщения: pending — ждёт ACK сервера.
    status?: "pending" | "sent";
    // Контент, зашифрованный ключом устройства (#5). Источник для чтения из
    // локального стора — не зависит от транспортного/эпохального ключа.
    store?: string;
    storeIv?: string;
}

export const lastMessageByChat = ref<Record<string, DecryptedMessage>>({});

export const PAGE_SIZE = 100;

export function useChatMessages() {
    const {
        read,
        write,
        readByIndex,
        readByIndexCursor,
        readLastByIndex,
        remove,
    } = useIndexedDb(STORES.MESSAGES);
    const { storageKey, encrypt, decrypt } = useCrypto();

    async function saveChatMessage(message: ChatMessage): Promise<void> {
        const msg = message as DecryptedMessage;
        // Контент шифруем ключом устройства (#5) → store; он переживёт ротацию
        // эпох. Транспортный payload/iv и плейнтекст на диск не пишем. Если
        // контента нет (обновление метаданных), существующий store сохраняем.
        const stored: Record<string, unknown> = { ...msg };
        const hasContent =
            msg.text !== undefined ||
            msg.files !== undefined ||
            msg.action !== undefined;
        if (hasContent && storageKey.value) {
            const content: MessageContent = {};
            if (msg.text !== undefined) content.text = msg.text;
            if (msg.files) content.files = msg.files;
            if (msg.action) content.action = msg.action;
            if (msg.targetNonce) content.targetNonce = msg.targetNonce;
            const enc = await encrypt(
                storageKey.value,
                JSON.stringify(content)
            );
            stored.store = toBase64(enc.payload);
            stored.storeIv = toBase64(enc.iv);
        }
        delete stored.text;
        delete stored.files;
        delete stored.action;
        delete stored.targetNonce;
        delete stored.payload;
        delete stored.iv;
        await write(JSON.parse(JSON.stringify(stored)));
        const current = lastMessageByChat.value[message.chatId];
        if (!current || message.timestamp >= current.timestamp) {
            // В памяти держим полный объект (с text) — для превью в списке чатов.
            lastMessageByChat.value[message.chatId] = msg;
        }
    }

    // Расшифровывает сообщение из локального стора ключом устройства (#5).
    // Чат-независимо — не нужен per-chat sharedKey.
    async function decryptStored(
        msg: DecryptedMessage
    ): Promise<DecryptedMessage> {
        if (!storageKey.value || !msg.store || !msg.storeIv) return msg;
        const raw = await decrypt(
            storageKey.value,
            fromBase64(msg.store),
            new Uint8Array(fromBase64(msg.storeIv))
        );
        return { ...msg, ...(JSON.parse(raw) as MessageContent) };
    }

    // Помечает исходящее сообщение доставленным на сервер (пришёл ACK).
    async function markSent(nonce: string, seq: number): Promise<void> {
        const stored = await read<DecryptedMessage>(nonce);
        if (!stored) return;
        const updated: DecryptedMessage = { ...stored, seq, status: "sent" };
        await saveChatMessage(updated);
    }

    async function getByChat(chatId: string): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, 0],
            [chatId, Number.MAX_SAFE_INTEGER]
        );
        return readByIndex<ChatMessage>(INDEX_CHAT_ID, range);
    }

    async function getLastPage(chatId: string): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, 0],
            [chatId, Number.MAX_SAFE_INTEGER]
        );
        const page = await readByIndexCursor<ChatMessage>(
            INDEX_CHAT_ID,
            range,
            PAGE_SIZE,
            "prev"
        );
        return page.reverse();
    }

    async function getPageBefore(
        chatId: string,
        beforeTimestamp: number
    ): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, 0],
            [chatId, beforeTimestamp],
            false,
            true
        );
        const page = await readByIndexCursor<ChatMessage>(
            INDEX_CHAT_ID,
            range,
            PAGE_SIZE,
            "prev"
        );
        return page.reverse();
    }

    async function getLastMessage(chatId: string): Promise<ChatMessage | null> {
        const range = IDBKeyRange.bound(
            [chatId, 0],
            [chatId, Number.MAX_SAFE_INTEGER]
        );
        return readLastByIndex<ChatMessage>(INDEX_CHAT_ID, range);
    }

    async function removeChatMessage(nonce: string): Promise<void> {
        await remove(nonce);
    }

    async function removeAllByChat(chatId: string): Promise<void> {
        const msgs = await getByChat(chatId);
        await Promise.all(msgs.map((m) => remove(m.nonce)));
    }

    return {
        saveChatMessage,
        decryptStored,
        markSent,
        getByChat,
        getLastPage,
        getPageBefore,
        getLastMessage,
        removeChatMessage,
        removeAllByChat,
    };
}
