import { WebSocket } from "ws";
import type { ChatMessage, ServerNotification, ServerPeerOffline, ServerPeerOnline, ServerPeerTyping, ServerPeerStopTyping } from "shared";
import type { Peer } from "../types.js";
import { NotificationService } from "./NotificationService.js";
import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ChatRepository } from "../repositories/ChatRepository.js";

export class PresenceService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private chatRepository: ChatRepository,
        private userEventQueue: UserEventQueue,
        private notificationService: NotificationService
    ) {}

    register(signPubKey: string, peer: Peer): void {
        peer.signPubKey = signPubKey;
        this.connectionRepository.set(signPubKey, peer);

        const pending = this.userEventQueue.flush(signPubKey);
        pending.forEach((event) => this.notificationService.send(peer, event));

        this.broadcastStatus(signPubKey, "peer_online");
    }

    unregister(peer: Peer): void {
        if (!peer.signPubKey) return;
        this.broadcastStatus(peer.signPubKey, "peer_offline");
        this.connectionRepository.delete(peer.signPubKey);
    }

    private broadcastStatus(signPubKey: string, type: "peer_online" | "peer_offline"): void {
        const chatIds = this.chatRepository.getChatsForUser(signPubKey);
        for (const chatId of chatIds) {
            const event: ServerPeerOnline | ServerPeerOffline = { type, payload: { chatId } };
            this.chatRepository
                .getAuthorizedKeys(chatId)
                .filter((k) => k !== signPubKey)
                .forEach((key) => {
                    const peerConn = this.connectionRepository.get(key);
                    if (peerConn?.readyState === WebSocket.OPEN) {
                        this.notificationService.send(peerConn, event);
                    }
                });
        }
    }

    broadcastTyping(chatId: string, senderKey: string, type: "peer_typing" | "peer_stop_typing"): void {
        const event: ServerPeerTyping | ServerPeerStopTyping = { type, payload: { chatId } };
        this.chatRepository
            .getAuthorizedKeys(chatId)
            .filter((k) => k !== senderKey)
            .forEach((key) => {
                const conn = this.connectionRepository.get(key);
                if (conn?.readyState === WebSocket.OPEN) {
                    this.notificationService.send(conn, event);
                }
            });
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
