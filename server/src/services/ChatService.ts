import { WebSocket } from "ws";
import type {
    Message,
    ServerError,
    ServerJoined,
    ServerMessageDelivery,
} from "shared";
import type { Peer } from "../types.js";
import { NotificationService } from "./NotificationService.js";
import { ChatInMemoryRepository } from "../repositories/ChatInMemoryRepository.js";
import { QueueInMemoryRepository } from "../repositories/QueueInMemoryRepository.js";
import { ParticipantInMemoryRepository } from "../repositories/ParticipantInMemoryRepository.js";

export class ChatService {
    constructor(
        private chatRepository: ChatInMemoryRepository,
        private queueRepository: QueueInMemoryRepository,
        private participantRepository: ParticipantInMemoryRepository,
        private notificationService: NotificationService
    ) {}

    join(chatId: string, userId: string, peer: Peer): void {
        if (this.chatRepository.count(chatId) >= 2) {
            const error: ServerError = {
                type: "error",
                message: "Chat is full. Only 2 participants allowed.",
            };
            this.notificationService.send(peer, error);
            return;
        }

        this.chatRepository.add(chatId, peer);
        this.participantRepository.add(chatId, userId);

        peer.chatId = chatId;
        peer.userId = userId;

        const pending = this.queueRepository.flush(chatId);
        pending.forEach((msg) => {
            const delivery: ServerMessageDelivery = {
                type: "message",
                payload: msg,
            };
            this.notificationService.send(peer, delivery);
        });

        const joined: ServerJoined = { type: "joined" };
        this.notificationService.send(peer, joined);
    }

    getRecipients(chatId: string, sender: Peer): Peer[] {
        return this.chatRepository
            .getPeers(chatId)
            .filter((p) => p !== sender && p.readyState === WebSocket.OPEN);
    }

    deliver(chatId: string, payload: Message, recipients: Peer[]): void {
        if (recipients.length > 0) {
            const delivery: ServerMessageDelivery = {
                type: "message",
                payload,
            };
            recipients.forEach((p) =>
                this.notificationService.send(p, delivery)
            );
        } else {
            this.queueRepository.push(chatId, payload);
        }
    }

    getParticipantIds(chatId: string): string[] {
        return this.participantRepository.getIds(chatId);
    }

    leave(peer: Peer): void {
        if (peer.chatId) this.chatRepository.remove(peer.chatId, peer);
    }
}
