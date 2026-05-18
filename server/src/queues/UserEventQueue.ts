import type { ServerMessage } from "shared";

export interface UserEventQueue {
    push(userId: string, event: ServerMessage): void;
    flush(userId: string): ServerMessage[];
}
