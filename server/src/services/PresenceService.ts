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
        this.connectionRepository.set(
            signPubKey,
            peer.deviceId ?? signPubKey,
            peer
        );

        const chatIds = this.chatMemberRepository.getChatIds(signPubKey);
        // Чаты, где кроме нас никого не осталось — собеседник вышел.
        const lefted = chatIds.filter(
            (chatId) => this.chatMemberRepository.getMembers(chatId).length <= 1
        );
        this.notificationService.sendEvent(peer, {
            type: "chat_list",
            payload: { chatIds, lefted },
        });

        // Непрочитанные — из явного счётчика аккаунта (транзитная v2-модель).
        const counts: Record<string, number> = {};
        for (const chatId of chatIds) {
            const n = this.chatMemberRepository.getUnread(chatId, signPubKey);
            if (n > 0) counts[chatId] = n;
        }
        this.notificationService.sendEvent(peer, {
            type: "unread",
            payload: { counts },
        });

        // Забираем очередь ЭТОГО устройства (per-device) — не чужую.
        const pending = this.userEventQueue.flush(
            signPubKey,
            peer.deviceId ?? ""
        );
        pending.forEach((event) =>
            this.notificationService.sendEvent(peer, event)
        );

        this.relay(signPubKey, peerKeys, "peer_online");

        // И наоборот — сообщаем ЭТОМУ устройству текущий онлайн его наблюдаемых
        // пиров (presence иначе шлётся только на переходы, и свежеподключённое
        // или свежеверифицированное устройство не узнало бы актуальный статус).
        for (const watchedKey of peerKeys) {
            if (this.isRegistered(watchedKey)) {
                this.notificationService.sendEvent(peer, {
                    type: "peer_online",
                    payload: { signPubKey: watchedKey },
                });
            }
        }
    }

    unregister(peer: Peer): void {
        if (!peer.signPubKey) return;
        const signPubKey = peer.signPubKey;
        const deviceId = peer.deviceId ?? signPubKey;
        // Удаляем только своё соединение — не затираем переподключившийся сокет.
        if (
            this.connectionRepository.getDevice(signPubKey, deviceId) !== peer
        ) {
            return;
        }
        this.connectionRepository.delete(signPubKey, deviceId);

        // Аккаунт уходит в оффлайн только когда отключилось последнее устройство.
        if (this.connectionRepository.getDevices(signPubKey).length > 0) return;

        const lastSeen = Date.now();
        // Presence эфемерна: только живым устройствам собеседников, без очереди
        // (протухший «оффлайн» в очереди вводил бы в заблуждение; при реконнекте
        // статус пересчитывается через announce-обмен).
        for (const recipientKey of peer.watchedPeers ?? []) {
            this.notificationService.fanLive(recipientKey, {
                type: "peer_offline",
                payload: { signPubKey, lastSeen },
            });
        }
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
        return this.connectionRepository
            .getDevices(signPubKey)
            .some((p) => p.readyState === WebSocket.OPEN);
    }

    // Пересылает presence о senderKey на ВСЕ живые устройства каждого получателя.
    // Авторизацию (верифицирован ли отправитель) решает клиент.
    private relay(
        senderKey: string,
        recipientKeys: string[],
        type: PresenceType
    ): void {
        for (const recipientKey of recipientKeys) {
            this.notificationService.fanLive(recipientKey, {
                type,
                payload: { signPubKey: senderKey },
            });
        }
    }
}
