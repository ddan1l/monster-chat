import { WebSocket } from "ws";
import type { Message, ServerNotification } from "shared";
import type { Peer } from "../types.js";
import { NotificationService } from "./NotificationService.js";
import { PresenceInMemoryRepository } from "../repositories/PresenceInMemoryRepository.js";

export class PresenceService {
    constructor(
        private presenceRepository: PresenceInMemoryRepository,
        private notificationService: NotificationService
    ) {}

    register(userId: string, peer: Peer): void {
        peer.userId = userId;
        this.presenceRepository.add(userId, peer);
    }

    unregister(peer: Peer): void {
        if (peer.userId) this.presenceRepository.remove(peer.userId);
    }

    notify(payload: Message, participantIds: string[]): void {
        const recipient = this.presenceRepository
            .getAll()
            .find(
                (p) =>
                    p.userId !== payload.senderId &&
                    p.userId !== undefined &&
                    participantIds.includes(p.userId) &&
                    p.readyState === WebSocket.OPEN
            );

        if (!recipient) return;

        const notification: ServerNotification = {
            type: "notification",
            payload,
        };
        this.notificationService.send(recipient, notification);
    }
}
