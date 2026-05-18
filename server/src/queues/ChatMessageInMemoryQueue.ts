import type { ChatMessage } from "shared";
import type { ChatMessageQueue } from "./ChatMessageQueue.js";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_KEY = 100;

interface Entry {
    message: ChatMessage;
    expiresAt: number;
}

export class ChatMessageInMemoryQueue implements ChatMessageQueue {
    private queue = new Map<string, Entry[]>();

    push(key: string, message: ChatMessage): void {
        if (!this.queue.has(key)) {
            this.queue.set(key, []);
        }
        const entries = this.queue.get(key)!;
        if (entries.length >= MAX_PER_KEY) {
            entries.shift();
        }
        entries.push({ message, expiresAt: Date.now() + TTL_MS });
    }

    flush(key: string): ChatMessage[] {
        const now = Date.now();
        const entries = (this.queue.get(key) ?? []).filter(
            (e) => e.expiresAt > now
        );
        this.queue.delete(key);
        return entries.map((e) => e.message);
    }
}
