import type { Peer } from "../types.js";

// signPubKey → live WebSocket connection
// Populated on 'online', cleared on disconnect.
export class ConnectionInMemoryRepository {
    private connections = new Map<string, Peer>();

    set(signPubKey: string, peer: Peer): void {
        this.connections.set(signPubKey, peer);
    }

    get(signPubKey: string): Peer | undefined {
        return this.connections.get(signPubKey);
    }

    delete(signPubKey: string): void {
        this.connections.delete(signPubKey);
    }

    getAll(): Peer[] {
        return [...this.connections.values()];
    }
}
