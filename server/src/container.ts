import Database from "better-sqlite3";

import { ChatMessageInMemoryQueue } from "./queues/ChatMessageInMemoryQueue.js";
import { ChatMessageSQLiteQueue } from "./queues/ChatMessageSQLiteQueue.js";
import { UserEventInMemoryQueue } from "./queues/UserEventInMemoryQueue.js";
import { UserEventSQLiteQueue } from "./queues/UserEventSQLiteQueue.js";
import { ConnectionInMemoryRepository } from "./repositories/ConnectionInMemoryRepository.js";
import { PendingChatInMemoryRepository } from "./repositories/PendingChatInMemoryRepository.js";
import { PushSubscriptionInMemoryRepository } from "./repositories/PushSubscriptionInMemoryRepository.js";
import { PushSubscriptionSQLiteRepository } from "./repositories/PushSubscriptionSQLiteRepository.js";
import { ChatService } from "./services/ChatService.js";
import { FileService } from "./services/FileService.js";
import { NotificationService } from "./services/NotificationService.js";
import { PresenceService } from "./services/PresenceService.js";
import { LocalFileStorage } from "./storage/LocalFileStorage.js";

import type { ChatMessageQueue } from "./queues/ChatMessageQueue.js";
import type { UserEventQueue } from "./queues/UserEventQueue.js";
import type { PushSubscriptionRepository } from "./repositories/PushSubscriptionRepository.js";

const driver = process.env.STORAGE_DRIVER ?? "memory";

let chatMessageQueue: ChatMessageQueue;
let userEventQueue: UserEventQueue;
let pushSubscriptionRepository: PushSubscriptionRepository;

if (driver === "sqlite") {
    const db = new Database(process.env.DB_PATH ?? "./data.db");
    chatMessageQueue = new ChatMessageSQLiteQueue(db);
    userEventQueue = new UserEventSQLiteQueue(db);
    pushSubscriptionRepository = new PushSubscriptionSQLiteRepository(db);
} else {
    chatMessageQueue = new ChatMessageInMemoryQueue();
    userEventQueue = new UserEventInMemoryQueue();
    pushSubscriptionRepository = new PushSubscriptionInMemoryRepository();
}

const connectionRepository = new ConnectionInMemoryRepository();
const pendingChatRepository = new PendingChatInMemoryRepository();

export const pushSubscriptions = pushSubscriptionRepository;

const fileStorage = new LocalFileStorage(
    process.env.UPLOADS_DIR ?? "./uploads"
);

const notificationService = new NotificationService(
    connectionRepository,
    userEventQueue,
    pushSubscriptionRepository
);

export const fileService = new FileService(fileStorage);
export const chatService = new ChatService(
    connectionRepository,
    chatMessageQueue,
    pendingChatRepository,
    notificationService,
    userEventQueue
);
export const presenceService = new PresenceService(
    connectionRepository,
    userEventQueue,
    notificationService
);
