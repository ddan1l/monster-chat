import type { Message } from "shared";

// TODO: messages are never evicted if the recipient never joins — add TTL or size limit
export class QueueInMemoryRepository {
    private queue = new Map<string, Message[]>();

    push(chatId: string, message: Message): void {
        if (!this.queue.has(chatId)) this.queue.set(chatId, []);
        this.queue.get(chatId)!.push(message);
    }

    flush(chatId: string): Message[] {
        const messages = this.queue.get(chatId) ?? [];
        this.queue.delete(chatId);
        return messages;
    }
}
