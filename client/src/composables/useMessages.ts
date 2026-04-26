import type { Message } from "shared";
import { useIndexedDb, STORES } from "./useIndexedDb";

const INDEX_CHAT_ID = "by_chatId";

export function useMessages() {
    const { write, readByIndex, remove } = useIndexedDb(STORES.MESSAGES);

    async function saveMessage(message: Message): Promise<void> {
        await write(message);
    }

    async function getByChat(chatId: string): Promise<Message[]> {
        return readByIndex<Message>(INDEX_CHAT_ID, chatId);
    }

    async function removeMessage(id: string): Promise<void> {
        await remove(id);
    }

    return { saveMessage, getByChat, removeMessage };
}
