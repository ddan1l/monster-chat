export interface ChatMemberRepository {
    add(chatId: string, signPubKey: string): void;
    getChatIds(signPubKey: string): string[];
    getMembers(chatId: string): string[];
    isMember(chatId: string, signPubKey: string): boolean;
    // Курсор прочтения: seq, до которого пользователь прочитал чат.
    getReadSeq(chatId: string, signPubKey: string): number;
    setReadSeq(chatId: string, signPubKey: string, seq: number): void;
    remove(chatId: string, signPubKey: string): void;
    removeByChat(chatId: string): void;
}
