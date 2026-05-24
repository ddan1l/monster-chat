import type { ChatRepository } from "./ChatRepository.js";

export class ChatInMemoryRepository implements ChatRepository {
    private chats = new Map<string, Set<string>>();

    authorize(chatId: string, signPubKey: string): void {
        if (!this.chats.has(chatId)) this.chats.set(chatId, new Set());
        this.chats.get(chatId)!.add(signPubKey);
    }

    isAuthorized(chatId: string, signPubKey: string): boolean {
        return this.chats.get(chatId)?.has(signPubKey) ?? false;
    }

    getAuthorizedKeys(chatId: string): string[] {
        return [...(this.chats.get(chatId) ?? [])];
    }

    getChatsForUser(signPubKey: string): string[] {
        const result: string[] = [];
        for (const [chatId, keys] of this.chats) {
            if (keys.has(signPubKey)) result.push(chatId);
        }
        return result;
    }
}
