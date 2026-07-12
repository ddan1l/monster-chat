import type { ChatMessage } from "shared";

export interface MessageRepository {
    // Проставляет message.seq (серверный монотонный курсор) после вставки.
    save(message: ChatMessage): void;
    getAfter(
        chatId: string,
        signPubKey: string,
        afterSeq: number
    ): ChatMessage[];
    getPage(
        chatId: string,
        signPubKey: string,
        beforeSeq: number,
        limit: number
    ): ChatMessage[];
    getMaxSeq(chatId: string): number;
    // Кол-во непрочитанных: сообщения, адресованные signPubKey, с seq > afterSeq.
    countUnread(chatId: string, signPubKey: string, afterSeq: number): number;
    removeByChat(chatId: string): void;
}
