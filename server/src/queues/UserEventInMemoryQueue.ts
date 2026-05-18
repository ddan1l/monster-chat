import type { ServerMessage } from "shared";
import type { UserEventQueue } from "./UserEventQueue.js";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_USER = 50;

interface Entry {
    event: ServerMessage;
    expiresAt: number;
}

export class UserEventInMemoryQueue implements UserEventQueue {
    private queue = new Map<string, Entry[]>();

    push(userId: string, event: ServerMessage): void {
        if (!this.queue.has(userId)) {
            this.queue.set(userId, []);
        }
        const entries = this.queue.get(userId)!;
        if (entries.length >= MAX_PER_USER) {
            entries.shift();
        }
        entries.push({ event, expiresAt: Date.now() + TTL_MS });
    }

    flush(userId: string): ServerMessage[] {
        const now = Date.now();
        const entries = (this.queue.get(userId) ?? []).filter(
            (e) => e.expiresAt > now
        );
        this.queue.delete(userId);
        return entries.map((e) => e.event);
    }
}
