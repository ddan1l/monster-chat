import { ref } from "vue";

import { useIndexedDb, STORES, INDEX_CHAT_ID } from "@shared/lib/useIndexedDb";

import type { ChatMessage, MessageContent } from "shared";

export interface DecryptedMessage extends ChatMessage, MessageContent {
    editedAt?: number;
    isRead?: boolean;
    isOwn?: boolean;
}

export const lastMessageByChat = ref<Record<string, DecryptedMessage>>({});

export const PAGE_SIZE = 100;

export function useChatMessages() {
    const { write, readByIndex, readByIndexCursor, readLastByIndex, remove } =
        useIndexedDb(STORES.MESSAGES);

    async function saveChatMessage(message: ChatMessage): Promise<void> {
        await write(JSON.parse(JSON.stringify(message)) as ChatMessage);
        const current = lastMessageByChat.value[message.chatId];
        if (!current || message.timestamp >= current.timestamp) {
            lastMessageByChat.value[message.chatId] = message;
        }
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
        getByChat,
        getLastPage,
        getPageBefore,
        getLastMessage,
        removeChatMessage,
        removeAllByChat,
    };
}
