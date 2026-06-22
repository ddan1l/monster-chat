import { WebSocket } from "ws";

import type { NotificationService } from "./NotificationService.js";
import type { PushService } from "./PushService.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { Peer } from "../types.js";

type PresenceType =
    | "peer_online"
    | "peer_offline"
    | "peer_typing"
    | "peer_stop_typing";

export class PresenceService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private userEventQueue: UserEventQueue,
        private notificationService: NotificationService,
        private pushService: PushService
    ) {}

    register(signPubKey: string, peer: Peer, peerKeys: string[]): void {
        peer.signPubKey = signPubKey;
        peer.watchedPeers = peerKeys;
        this.connectionRepository.set(signPubKey, peer);

        const pending = this.userEventQueue.flush(signPubKey);
        pending.forEach((event) => this.notificationService.send(peer, event));

        this.relay(signPubKey, peerKeys, "peer_online");
    }

    unregister(peer: Peer): void {
        if (!peer.signPubKey) return;
        this.relay(peer.signPubKey, peer.watchedPeers ?? [], "peer_offline");
        this.connectionRepository.delete(peer.signPubKey);
    }

    broadcastTyping(
        senderKey: string,
        recipientKeys: string[],
        type: "peer_typing" | "peer_stop_typing"
    ): void {
        this.relay(senderKey, recipientKeys, type);
    }

    notify(chatId: string, recipientKey: string): void {
        const recipient = this.connectionRepository.get(recipientKey);
        if (recipient?.chatId === chatId) return;
        this.pushService.notify(recipientKey, chatId);
    }

    isRegistered(signPubKey: string): boolean {
        const peer = this.connectionRepository.get(signPubKey);
        return peer?.readyState === WebSocket.OPEN;
    }

    // Пересылает событие о senderKey каждому из перечисленных подключённых
    // получателей. Авторизацию (верифицирован ли отправитель) решает клиент.
    private relay(
        senderKey: string,
        recipientKeys: string[],
        type: PresenceType
    ): void {
        for (const recipientKey of recipientKeys) {
            const conn = this.connectionRepository.get(recipientKey);
            if (conn?.readyState !== WebSocket.OPEN) continue;
            this.notificationService.send(conn, {
                type,
                payload: { signPubKey: senderKey },
            });
        }
    }
}
