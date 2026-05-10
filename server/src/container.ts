import { ChatInMemoryRepository } from "./repositories/ChatInMemoryRepository.js";
import { ConnectionInMemoryRepository } from "./repositories/ConnectionInMemoryRepository.js";
import { ChatMessageInMemoryQueue } from "./repositories/ChatMessageInMemoryQueue.js";
import { UserEventInMemoryQueue } from "./repositories/UserEventInMemoryQueue.js";
import { PendingChatInMemoryRepository } from "./repositories/PendingChatInMemoryRepository.js";
import { NotificationService } from "./services/NotificationService.js";
import { ChatService } from "./services/ChatService.js";
import { PresenceService } from "./services/PresenceService.js";

const chatRepository = new ChatInMemoryRepository();
const connectionRepository = new ConnectionInMemoryRepository();
const chatMessageQueue = new ChatMessageInMemoryQueue();
const userEventQueue = new UserEventInMemoryQueue();
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
    userEventQueue,
    notificationService
);
