import type { Peer } from "../types.js";

export class ChatInMemoryRepository {
    private chats = new Map<string, Peer[]>();

    add(chatId: string, peer: Peer): void {
        if (!this.chats.has(chatId)) this.chats.set(chatId, []);
        this.chats.get(chatId)!.push(peer);
    }

    remove(chatId: string, peer: Peer): void {
        const peers = this.chats.get(chatId);
        if (!peers) return;
        this.chats.set(
            chatId,
            peers.filter((p) => p !== peer)
        );
    }

    getPeers(chatId: string): Peer[] {
        return this.chats.get(chatId) ?? [];
    }

    count(chatId: string): number {
        return this.getPeers(chatId).length;
    }
}
