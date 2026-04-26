import type { Peer } from "../types.js";

export class PresenceInMemoryRepository {
    private online = new Map<string, Peer>();

    add(userId: string, peer: Peer): void {
        this.online.set(userId, peer);
    }

    remove(userId: string): void {
        this.online.delete(userId);
    }

    getAll(): Peer[] {
        return [...this.online.values()];
    }
}
