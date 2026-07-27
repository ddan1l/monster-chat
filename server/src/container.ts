import Database from "better-sqlite3";

import { UserEventSQLiteQueue } from "./queues/UserEventSQLiteQueue.js";
import { ChatMemberSQLiteRepository } from "./repositories/ChatMemberSQLiteRepository.js";
import { ConnectionInMemoryRepository } from "./repositories/ConnectionInMemoryRepository.js";
import { DeviceSQLiteRepository } from "./repositories/DeviceSQLiteRepository.js";
import { MessageSQLiteRepository } from "./repositories/MessageSQLiteRepository.js";
import { PendingChatInMemoryRepository } from "./repositories/PendingChatInMemoryRepository.js";
import { PushSubscriptionSQLiteRepository } from "./repositories/PushSubscriptionSQLiteRepository.js";
import { ChatService } from "./services/ChatService.js";
import { FileService } from "./services/FileService.js";
import { NotificationService } from "./services/NotificationService.js";
import { PresenceService } from "./services/PresenceService.js";
import { LocalFileStorage } from "./storage/LocalFileStorage.js";

const db = new Database(process.env.DB_PATH ?? "./data.db");

const userEventQueue = new UserEventSQLiteQueue(db);
const pushSubscriptionRepository = new PushSubscriptionSQLiteRepository(db);
export const messageRepository = new MessageSQLiteRepository(db);
export const chatMemberRepository = new ChatMemberSQLiteRepository(db);
export const deviceRepository = new DeviceSQLiteRepository(db);

// Живые WebSocket-подключения и незавершённые handshake'и хранятся только в
// памяти — персистить их нельзя.
const connectionRepository = new ConnectionInMemoryRepository();
const pendingChatRepository = new PendingChatInMemoryRepository();

export const pushSubscriptions = pushSubscriptionRepository;

const fileStorage = new LocalFileStorage(
    process.env.UPLOADS_DIR ?? "./uploads"
);

const notificationService = new NotificationService(
    connectionRepository,
    userEventQueue,
    pushSubscriptionRepository,
    deviceRepository
);

export const fileService = new FileService(fileStorage);
export const chatService = new ChatService(
    connectionRepository,
    messageRepository,
    chatMemberRepository,
    pendingChatRepository,
    notificationService,
    userEventQueue
);
export const presenceService = new PresenceService(
    connectionRepository,
    userEventQueue,
    notificationService,
    chatMemberRepository,
    messageRepository
);
