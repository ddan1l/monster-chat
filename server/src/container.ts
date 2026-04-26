import { ChatInMemoryRepository } from "./repositories/ChatInMemoryRepository.js";
import { QueueInMemoryRepository } from "./repositories/QueueInMemoryRepository.js";
import { ParticipantInMemoryRepository } from "./repositories/ParticipantInMemoryRepository.js";
import { PresenceInMemoryRepository } from "./repositories/PresenceInMemoryRepository.js";
import { NotificationService } from "./services/NotificationService.js";
import { ChatService } from "./services/ChatService.js";
import { PresenceService } from "./services/PresenceService.js";

const chatRepository = new ChatInMemoryRepository();
const queueRepository = new QueueInMemoryRepository();
const participantRepository = new ParticipantInMemoryRepository();
const presenceRepository = new PresenceInMemoryRepository();

export const notificationService = new NotificationService();
export const chatService = new ChatService(chatRepository, queueRepository, participantRepository, notificationService);
export const presenceService = new PresenceService(presenceRepository, notificationService);
