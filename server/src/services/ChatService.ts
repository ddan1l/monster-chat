import { WebSocket } from "ws";

import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import { PendingChatInMemoryRepository } from "../repositories/PendingChatInMemoryRepository.js";

import { NotificationService } from "./NotificationService.js";

import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ChatMemberRepository } from "../repositories/ChatMemberRepository.js";
import type { MessageRepository } from "../repositories/MessageRepository.js";
import type { Peer } from "../types.js";
import type {
    ChatMessage,
    MessageBundle,
    PeerInfo,
    ServerError,
    ServerChatOpened,
    ServerChatCreated,
    ServerChatDestroyed,
    ServerChatDeleted,
    ServerPeerInfo,
    ServerMessageDelivery,
    ServerMessage,
} from "shared";

export class ChatService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private messageRepository: MessageRepository,
        private chatMemberRepository: ChatMemberRepository,
        private pendingChatRepository: PendingChatInMemoryRepository,
        private notificationService: NotificationService,
        private userEventQueue: UserEventQueue
    ) {}

    // «Прочитано»: двигаем курсор к текущему максимуму чата.
    markRead(chatId: string, signPubKey: string): void {
        const maxSeq = this.messageRepository.getMaxSeq(chatId);
        this.chatMemberRepository.setReadSeq(chatId, signPubKey, maxSeq);
    }

    join(chatId: string, deviceId: string, peer: Peer, afterSeq = 0): void {
        peer.chatId = chatId;

        // Транзит: курсор afterSeq подтверждает, что устройство имеет всё до него
        // (у клиента durable-стор — дом истории), поэтому его копии до afterSeq на
        // сервере больше не нужны — удаляем.
        this.messageRepository.deleteDeviceDeliveredUpTo(
            chatId,
            deviceId,
            afterSeq
        );

        // Пропущенное — копии, адресованные этому устройству, с seq > курсора.
        const missed = this.messageRepository.getAfterForDevice(
            chatId,
            deviceId,
            afterSeq
        );

        missed.forEach((msg) => {
            const delivery: ServerMessageDelivery = {
                type: "message",
                payload: msg,
            };
            this.notificationService.sendEvent(peer, delivery);
        });

        const joined: ServerChatOpened = { type: "chat_opened" };
        this.notificationService.sendEvent(peer, joined);
    }

    // v2 (FS): разворачивает бандл в per-device конверты, сохраняет каждую копию
    // (device-scoped) и доставляет её целевому устройству, если оно онлайн;
    // остальные подтянут через getAfterForDevice при open_chat.
    deliverBundle(bundle: MessageBundle, senderDeviceId?: string): void {
        if (!this.chatMemberRepository.isMember(bundle.chatId, bundle.from)) {
            return;
        }

        for (const copy of bundle.copies) {
            const msg: ChatMessage = {
                chatId: bundle.chatId,
                from: bundle.from,
                to: bundle.to,
                nonce: bundle.nonce,
                timestamp: bundle.timestamp,
                silent: bundle.silent,
                targetDeviceId: copy.targetDeviceId,
                epochId: copy.epochId,
                ephemeralPub: copy.ephemeralPub,
                iv: copy.iv,
                payload: copy.payload,
                signature: copy.signature,
            };
            this.messageRepository.save(msg);

            // Целевое устройство — под аккаунтом получателя или отправителя
            // (своё другое устройство). Доставляем вживую, если оно онлайн.
            const conn =
                this.connectionRepository.getDevice(
                    bundle.to,
                    copy.targetDeviceId
                ) ??
                this.connectionRepository.getDevice(
                    bundle.from,
                    copy.targetDeviceId
                );
            // Вживую — только если устройство смотрит этот чат (как в v1);
            // иначе подтянет свою копию через getAfterForDevice при open_chat.
            if (
                conn?.readyState === WebSocket.OPEN &&
                conn.chatId === bundle.chatId
            ) {
                this.notificationService.sendEvent(conn, {
                    type: "message",
                    payload: msg,
                });
            }
        }

        // ACK один раз отправившему устройству (по логическому nonce).
        // Отправленные сообщения — локальные, серверного seq у них нет; курсор
        // устройства считается по полученным копиям, поэтому seq номинальный.
        const senderConn = senderDeviceId
            ? this.connectionRepository.getDevice(bundle.from, senderDeviceId)
            : undefined;
        if (senderConn?.readyState === WebSocket.OPEN) {
            this.notificationService.sendEvent(senderConn, {
                type: "ack",
                payload: { nonce: bundle.nonce, seq: 0 },
            });
        }
    }

    // Удаление только для себя: снимаем своё членство и счётчик, второму
    // участнику шлём chat_deleted (у него чат становится read-only). Сообщения
    // остаются для него; если участников не осталось — чистим.
    deleteChatForMe(chatId: string, signPubKey: string): void {
        this.chatMemberRepository.remove(chatId, signPubKey);

        const remaining = this.chatMemberRepository.getMembers(chatId);
        if (remaining.length === 0) {
            this.messageRepository.removeByChat(chatId);
            return;
        }

        const event: ServerChatDeleted = {
            type: "chat_deleted",
            payload: { chatId },
        };
        for (const member of remaining) {
            this.notificationService.deliverToAccount(member, event);
        }
    }

    // Удаление для всех: сносим членства и сообщения, остальным шлём
    // chat_destroyed (или кладём в очередь, если оффлайн).
    deleteChatForAll(chatId: string, signPubKey: string): void {
        if (!this.chatMemberRepository.isMember(chatId, signPubKey)) return;

        const members = this.chatMemberRepository.getMembers(chatId);
        const event: ServerChatDestroyed = {
            type: "chat_destroyed",
            payload: { chatId },
        };

        for (const member of members) {
            if (member === signPubKey) continue;
            this.notificationService.deliverToAccount(member, event);
        }

        this.chatMemberRepository.removeByChat(chatId);
        this.messageRepository.removeByChat(chatId);
    }

    initChat(chatId: string, hostKey: string, peer: Peer): void {
        peer.signPubKey = hostKey;
        this.pendingChatRepository.add(chatId, hostKey, peer);
    }

    cancelChat(chatId: string): void {
        this.pendingChatRepository.remove(chatId);
    }

    knockChat(
        chatId: string,
        hostKey: string,
        peerInfo: PeerInfo,
        knockerPeer: Peer,
        timezone?: string
    ): void {
        const pending = this.pendingChatRepository.get(chatId);

        if (!pending || pending.hostKey !== hostKey) {
            const error: ServerError = {
                type: "error",
                message: "Invalid chat or fingerprint.",
            };
            this.notificationService.sendEvent(knockerPeer, error);
            return;
        }

        this.pendingChatRepository.addKnock(
            chatId,
            peerInfo.signPubKey,
            peerInfo,
            knockerPeer
        );

        const ip = knockerPeer.ip;
        const event = {
            type: "chat_knock" as const,
            payload: { chatId, peerInfo, ip, timezone },
        };
        // Стук — на все устройства хоста, чтобы одобрить можно было с любого.
        this.notificationService.deliverToAccount(pending.hostKey, event);
    }

    approveChat(chatId: string, peerInfo: PeerInfo, peer: Peer): void {
        const pending = this.pendingChatRepository.get(chatId);

        if (!pending?.knock) {
            const error: ServerError = {
                type: "error",
                message: "No pending knock for this chat.",
            };
            this.notificationService.sendEvent(peer, error);
            return;
        }

        const knock = pending.knock;
        this.pendingChatRepository.remove(chatId);

        this.chatMemberRepository.add(chatId, pending.hostKey);
        this.chatMemberRepository.add(chatId, knock.knockerKey);

        const chatCreated: ServerChatCreated = {
            type: "chat_created",
            payload: { chatId },
        };
        // chat_created — на все устройства обоих аккаунтов (мультидевайс: остальные
        // устройства должны узнать о новом чате, а не только активное).
        this.notificationService.deliverToAccount(pending.hostKey, chatCreated);
        this.notificationService.deliverToAccount(
            knock.knockerKey,
            chatCreated
        );

        // peer_info раздаём КРЕСТ-НАКРЕСТ всем устройствам: личность approver'а —
        // всем устройствам knocker'а, и личность knocker'а — всем устройствам
        // approver'а. Иначе другое устройство не знает собеседника и отвергает
        // его сообщения («Invalid signature»).
        this.notificationService.deliverToAccount(knock.knockerKey, {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        });
        this.notificationService.deliverToAccount(pending.hostKey, {
            type: "peer_info",
            payload: { ...knock.peerInfo, chatId },
        });
    }

    relayPeerInfo(
        chatId: string,
        peerInfo: PeerInfo,
        peerSignPubKey: string
    ): void {
        this.notificationService.deliverToAccount(peerSignPubKey, {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        });
    }
}
