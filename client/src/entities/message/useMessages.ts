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
    // Провал расшифровки/подписи (возможно транзитный) — такое сообщение НЕ
    // персистим, показываем транзитно и повторяем при следующей синхронизации.
    decryptError?: boolean;
    // Контент, зашифрованный ключом устройства (#5). Источник для чтения из
    // локального стора — не зависит от транспортного/эпохального ключа.
    store?: string;
    storeIv?: string;
}

export const lastMessageByChat = ref<Record<string, DecryptedMessage>>({});

export const PAGE_SIZE = 100;

// Локальный ключ дня YYYY-MM-DD — единый для календаря прыжка и группировки.
export function dateKey(ts: number): string {
    const d = new Date(ts);
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

// Начало локального дня, в котором лежит ts (для прыжка по дате).
export function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

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

    // Прыжок по дате: страница сообщений начиная с fromTimestamp (включительно),
    // по возрастанию. Первое сообщение — ближайшее на/после указанного момента.
    async function getPageFromDate(
        chatId: string,
        fromTimestamp: number
    ): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, fromTimestamp],
            [chatId, Number.MAX_SAFE_INTEGER]
        );
        return readByIndexCursor<ChatMessage>(
            INDEX_CHAT_ID,
            range,
            PAGE_SIZE,
            "next"
        );
    }

    // Подгрузка вниз (новее afterTimestamp) — для скролла из исторического окна
    // к настоящему. По возрастанию.
    async function getPageAfter(
        chatId: string,
        afterTimestamp: number
    ): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, afterTimestamp],
            [chatId, Number.MAX_SAFE_INTEGER],
            true,
            false
        );
        return readByIndexCursor<ChatMessage>(
            INDEX_CHAT_ID,
            range,
            PAGE_SIZE,
            "next"
        );
    }

    // Дни (локальные YYYY-MM-DD), в которые есть сообщения, + границы диапазона —
    // для календаря прыжка. Один проход по индексу без расшифровки (timestamp
    // лежит открыто). Тяжело для очень длинных чатов, но только при открытии.
    async function getMessageDays(
        chatId: string
    ): Promise<{ days: Set<string>; min: number; max: number } | null> {
        const msgs = await getByChat(chatId);
        if (msgs.length === 0) return null;
        const days = new Set<string>();
        let min = Infinity;
        let max = -Infinity;
        for (const m of msgs) {
            days.add(dateKey(m.timestamp));
            if (m.timestamp < min) min = m.timestamp;
            if (m.timestamp > max) max = m.timestamp;
        }
        return { days, min, max };
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
        getPageFromDate,
        getPageAfter,
        getMessageDays,
        getLastMessage,
        removeChatMessage,
        removeAllByChat,
    };
}
