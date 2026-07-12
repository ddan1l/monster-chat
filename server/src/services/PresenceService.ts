import { WebSocket } from "ws";

import type { NotificationService } from "./NotificationService.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ChatMemberRepository } from "../repositories/ChatMemberRepository.js";
import type { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { MessageRepository } from "../repositories/MessageRepository.js";
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
        private chatMemberRepository: ChatMemberRepository,
        private messageRepository: MessageRepository
    ) {}

    register(signPubKey: string, peer: Peer, peerKeys: string[]): void {
        peer.signPubKey = signPubKey;
        peer.watchedPeers = peerKeys;
        this.connectionRepository.set(signPubKey, peer);

        const chatIds = this.chatMemberRepository.getChatIds(signPubKey);
        // Чаты, где кроме нас никого не осталось — собеседник вышел.
        const lefted = chatIds.filter(
            (chatId) => this.chatMemberRepository.getMembers(chatId).length <= 1
        );
        this.notificationService.sendEvent(peer, {
            type: "chat_list",
            payload: { chatIds, lefted },
        });

        // Непрочитанные выводим из сообщений и курсора read_seq (без счётчика).
        const counts: Record<string, number> = {};
        for (const chatId of chatIds) {
            const readSeq = this.chatMemberRepository.getReadSeq(
                chatId,
                signPubKey
            );
            const n = this.messageRepository.countUnread(
                chatId,
                signPubKey,
                readSeq
            );
            if (n > 0) counts[chatId] = n;
        }
        this.notificationService.sendEvent(peer, {
            type: "unread",
            payload: { counts },
        });

        const pending = this.userEventQueue.flush(signPubKey);
        pending.forEach((event) =>
            this.notificationService.sendEvent(peer, event)
        );

        this.relay(signPubKey, peerKeys, "peer_online");
    }

    unregister(peer: Peer): void {
        if (!peer.signPubKey) return;
        if (this.connectionRepository.get(peer.signPubKey) !== peer) return;

        const signPubKey = peer.signPubKey;
        const lastSeen = Date.now();

        // Live relay онлайн-пирам.
        for (const recipientKey of peer.watchedPeers ?? []) {
            const conn = this.connectionRepository.get(recipientKey);
            if (conn?.readyState !== WebSocket.OPEN) continue;
            this.notificationService.sendEvent(conn, {
                type: "peer_offline",
                payload: { signPubKey, lastSeen },
            });
        }

        // Оффлайн-пирам кладём в очередь — получат при подключении.
        const chatIds = this.chatMemberRepository.getChatIds(signPubKey);
        const queued = new Set<string>();
        for (const chatId of chatIds) {
            for (const memberKey of this.chatMemberRepository.getMembers(
                chatId
            )) {
                if (memberKey === signPubKey || queued.has(memberKey)) continue;
                const conn = this.connectionRepository.get(memberKey);
                if (conn?.readyState === WebSocket.OPEN) continue;
                queued.add(memberKey);
                this.userEventQueue.push(memberKey, {
                    type: "peer_offline",
                    payload: { signPubKey, lastSeen },
                });
            }
        }

        this.connectionRepository.delete(signPubKey);
    }

    setAway(signPubKey: string, peerKeys: string[]): void {
        this.relay(signPubKey, peerKeys, "peer_offline");
    }

    setOnline(signPubKey: string, peerKeys: string[]): void {
        this.relay(signPubKey, peerKeys, "peer_online");
    }

    broadcastTyping(
        senderKey: string,
        recipientKeys: string[],
        type: "peer_typing" | "peer_stop_typing"
    ): void {
        this.relay(senderKey, recipientKeys, type);
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
            this.notificationService.sendEvent(conn, {
                type,
                payload: { signPubKey: senderKey },
            });
        }
    }
}
