import type { ChatMessage } from "shared";
import { useIndexedDb, STORES, INDEX_CHAT_ID } from "./useIndexedDb";

export function useChatMessages() {
    const { write, readByIndex, remove } = useIndexedDb(STORES.MESSAGES);

    async function saveChatMessage(message: ChatMessage): Promise<void> {
        await write(message);
    }

    async function getByChat(chatId: string): Promise<ChatMessage[]> {
        const range = IDBKeyRange.bound(
            [chatId, 0],
            [chatId, Number.MAX_SAFE_INTEGER]
        );

        return readByIndex<ChatMessage>(INDEX_CHAT_ID, range);
    }

    async function removeChatMessage(nonce: string): Promise<void> {
        await remove(nonce);
    }

    return { saveChatMessage, getByChat, removeChatMessage };
}
