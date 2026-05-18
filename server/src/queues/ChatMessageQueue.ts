import type { ChatMessage } from "shared";

export interface ChatMessageQueue {
    push(key: string, message: ChatMessage): void;
    flush(key: string): ChatMessage[];
}
