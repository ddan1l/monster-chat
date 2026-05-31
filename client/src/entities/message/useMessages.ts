import { ref } from "vue";
import type { ChatMessage, MessageContent } from "shared";
import { useIndexedDb, STORES, INDEX_CHAT_ID } from "@shared/lib/useIndexedDb";

export interface DecryptedMessage extends ChatMessage, MessageContent {
    editedAt?: number;
    isRead?: boolean;
}

export const lastMessageByChat = ref<Record<string, DecryptedMessage>>({});

export function useChatMessages() {
    const { write, readByIndex, readLastByIndex, remove } = useIndexedDb(
        STORES.MESSAGES
    );

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
        getLastMessage,
        removeChatMessage,
        removeAllByChat,
    };
}
