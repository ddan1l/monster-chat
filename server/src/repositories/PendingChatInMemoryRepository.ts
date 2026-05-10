import type { PeerInfo } from "shared";
import type { Peer } from "../types.js";

interface Knock {
    knockerKey: string; // knocker's signPubKey — used to authorize them in ChatInMemoryRepository
    peerInfo: PeerInfo;
    peer: Peer;
}

// Temporary state between init_chat and approve_chat.
// Holds who created the chat (hostKey) and who knocked (knock).
// Removed as soon as the chat is approved.
interface PendingChat {
    hostKey: string; // host's signPubKey — verified against the join link
    peer: Peer;
    knock?: Knock;
}

export class PendingChatInMemoryRepository {
    private pending = new Map<string, PendingChat>();

    add(chatId: string, hostKey: string, peer: Peer): void {
        this.pending.set(chatId, { hostKey, peer });
    }

    addKnock(
        chatId: string,
        knockerKey: string,
        peerInfo: PeerInfo,
        knockerPeer: Peer
    ): boolean {
        const existing = this.pending.get(chatId);
        if (!existing) return false;
        existing.knock = { knockerKey, peerInfo, peer: knockerPeer };
        return true;
    }

    get(chatId: string): PendingChat | undefined {
        return this.pending.get(chatId);
    }

    remove(chatId: string): void {
        this.pending.delete(chatId);
    }
}
