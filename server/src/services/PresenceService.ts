import { WebSocket } from "ws";
import type { ChatMessage, ServerNotification } from "shared";
import type { Peer } from "../types.js";
import { NotificationService } from "./NotificationService.js";
import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";

export class PresenceService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private userEventQueue: UserEventQueue,
        private notificationService: NotificationService
    ) {}

    register(signPubKey: string, peer: Peer): void {
        peer.signPubKey = signPubKey;
        this.connectionRepository.set(signPubKey, peer);

        const pending = this.userEventQueue.flush(signPubKey);
        pending.forEach((event) => this.notificationService.send(peer, event));
    }

    unregister(peer: Peer): void {
        if (peer.signPubKey) {
            this.connectionRepository.delete(peer.signPubKey);
        }
    }

    notify(payload: ChatMessage, participantIds: string[]): void {
        const recipient = this.connectionRepository
            .getAll()
            .find(
                (p) =>
                    p.signPubKey !== payload.from &&
                    p.signPubKey !== undefined &&
                    participantIds.includes(p.signPubKey) &&
                    p.readyState === WebSocket.OPEN
            );

        if (!recipient) return;

        const notification: ServerNotification = { type: "notification", payload };
        this.notificationService.send(recipient, notification);
    }
}
