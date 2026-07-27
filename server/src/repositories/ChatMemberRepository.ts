export interface ChatMemberRepository {
    add(chatId: string, signPubKey: string): void;
    getChatIds(signPubKey: string): string[];
    getMembers(chatId: string): string[];
    isMember(chatId: string, signPubKey: string): boolean;
    // Непрочитанные на (чат, аккаунт): явный счётчик (транзитная v2-модель).
    getUnread(chatId: string, signPubKey: string): number;
    bumpUnread(chatId: string, signPubKey: string): number;
    clearUnread(chatId: string, signPubKey: string): void;
    remove(chatId: string, signPubKey: string): void;
    removeByChat(chatId: string): void;
}
