import Database from "better-sqlite3";
import { ChatInMemoryRepository } from "./repositories/ChatInMemoryRepository.js";
import { ChatSQLiteRepository } from "./repositories/ChatSQLiteRepository.js";
import { ConnectionInMemoryRepository } from "./repositories/ConnectionInMemoryRepository.js";
import { PendingChatInMemoryRepository } from "./repositories/PendingChatInMemoryRepository.js";
import type { ChatRepository } from "./repositories/ChatRepository.js";
import { ChatMessageInMemoryQueue } from "./queues/ChatMessageInMemoryQueue.js";
import { ChatMessageSQLiteQueue } from "./queues/ChatMessageSQLiteQueue.js";
import { UserEventInMemoryQueue } from "./queues/UserEventInMemoryQueue.js";
import { UserEventSQLiteQueue } from "./queues/UserEventSQLiteQueue.js";
import type { ChatMessageQueue } from "./queues/ChatMessageQueue.js";
import type { UserEventQueue } from "./queues/UserEventQueue.js";
import { NotificationService } from "./services/NotificationService.js";
import { ChatService } from "./services/ChatService.js";
import { PresenceService } from "./services/PresenceService.js";

const driver = process.env.STORAGE_DRIVER ?? "memory";

let chatRepository: ChatRepository;
let chatMessageQueue: ChatMessageQueue;
let userEventQueue: UserEventQueue;

if (driver === "sqlite") {
    const db = new Database(process.env.DB_PATH ?? "./data.db");
    chatRepository = new ChatSQLiteRepository(db);
    chatMessageQueue = new ChatMessageSQLiteQueue(db);
    userEventQueue = new UserEventSQLiteQueue(db);
} else {
    chatRepository = new ChatInMemoryRepository();
    chatMessageQueue = new ChatMessageInMemoryQueue();
    userEventQueue = new UserEventInMemoryQueue();
}

const connectionRepository = new ConnectionInMemoryRepository();
const pendingChatRepository = new PendingChatInMemoryRepository();

export const notificationService = new NotificationService();
export const chatService = new ChatService(
    chatRepository,
    connectionRepository,
    chatMessageQueue,
    pendingChatRepository,
    notificationService,
    userEventQueue
);
export const presenceService = new PresenceService(
    connectionRepository,
    chatRepository,
    userEventQueue,
    notificationService
);
