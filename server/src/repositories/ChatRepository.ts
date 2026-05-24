export interface ChatRepository {
    authorize(chatId: string, signPubKey: string): void;
    isAuthorized(chatId: string, signPubKey: string): boolean;
    getAuthorizedKeys(chatId: string): string[];
    getChatsForUser(signPubKey: string): string[];
}
