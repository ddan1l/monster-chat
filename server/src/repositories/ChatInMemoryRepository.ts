import type { ChatRepository } from "./ChatRepository.js";

// chatId → authorized signPubKeys
// Represents who is allowed to participate in each chat.
// Populated on approveChat, persists until server restart.
export class ChatInMemoryRepository implements ChatRepository {
    private rooms = new Map<string, Set<string>>();

    authorize(chatId: string, signPubKey: string): void {
        if (!this.rooms.has(chatId)) this.rooms.set(chatId, new Set());
        this.rooms.get(chatId)!.add(signPubKey);
    }

    isAuthorized(chatId: string, signPubKey: string): boolean {
        return this.rooms.get(chatId)?.has(signPubKey) ?? false;
    }

    getAuthorizedKeys(chatId: string): string[] {
        return [...(this.rooms.get(chatId) ?? [])];
    }
}
