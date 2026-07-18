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

    // Непрочитанные выводим из сообщений и курсора read_seq — отдельного
    // счётчика нет, дрейфовать нечему.
    private unreadCount(chatId: string, signPubKey: string): number {
        const readSeq = this.chatMemberRepository.getReadSeq(
            chatId,
            signPubKey
        );
        return this.messageRepository.countUnread(chatId, signPubKey, readSeq);
    }

    // «Прочитано»: двигаем курсор к текущему максимуму чата.
    markRead(chatId: string, signPubKey: string): void {
        const maxSeq = this.messageRepository.getMaxSeq(chatId);
        this.chatMemberRepository.setReadSeq(chatId, signPubKey, maxSeq);
    }

    join(chatId: string, signPubKey: string, peer: Peer, afterSeq = 0): void {
        peer.chatId = chatId;

        const missed = this.messageRepository.getAfter(
            chatId,
            signPubKey,
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

    deliver(chatId: string, payload: ChatMessage): void {
        // Писать в чат может только его участник. payload.from уже сверен с
        // аутентифицированным ключом в onMessage, поэтому гейта по from хватает.
        if (!this.chatMemberRepository.isMember(chatId, payload.from)) {
            return;
        }

        const delivery: ServerMessageDelivery = { type: "message", payload };
        const recipientKey = payload.to;
        const recipient = this.connectionRepository.get(recipientKey);

        // Сохраняем всё (в т.ч. silent — правки/удаления/квитанции), чтобы
        // оффлайн-пир получил их при следующем open_chat через getAfter.
        // save() проставляет payload.seq.
        this.messageRepository.save(payload);

        // ACK отправителю: сообщение персистентно записано, seq присвоен.
        const sender = this.connectionRepository.get(payload.from);
        if (
            sender?.readyState === WebSocket.OPEN &&
            payload.seq !== undefined
        ) {
            this.notificationService.sendEvent(sender, {
                type: "ack",
                payload: { nonce: payload.nonce, seq: payload.seq },
            });
        }

        // Живая доставка только если пир смотрит именно этот чат; иначе он
        // подтянет сообщение сам при открытии чата.
        if (
            recipient?.readyState === WebSocket.OPEN &&
            recipient.chatId === chatId
        ) {
            this.notificationService.sendEvent(recipient, delivery);
        }

        // Уведомление шлём только участнику: если он удалил чат у себя,
        // осиротевших непрочитанных быть не должно.
        if (
            !payload.silent &&
            this.chatMemberRepository.isMember(chatId, recipientKey)
        ) {
            const unread = this.unreadCount(chatId, recipientKey);
            this.notificationService.notify(recipientKey, chatId, unread);
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
            const conn = this.connectionRepository.get(member);
            if (conn?.readyState === WebSocket.OPEN) {
                this.notificationService.sendEvent(conn, event);
            } else {
                this.userEventQueue.push(member, event);
            }
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
            const recipient = this.connectionRepository.get(member);
            if (recipient?.readyState === WebSocket.OPEN) {
                this.notificationService.sendEvent(recipient, event);
            } else {
                this.userEventQueue.push(member, event);
            }
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
        this.sendOrQueue(pending.peer, event, pending.peer.signPubKey!);
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

        this.sendOrQueue(peer, chatCreated, pending.hostKey);
        this.sendOrQueue(knock.peer, chatCreated, knock.knockerKey);

        const aPeerInfo: ServerPeerInfo = {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        };

        this.sendOrQueue(knock.peer, aPeerInfo, knock.knockerKey);
    }

    relayPeerInfo(
        chatId: string,
        peerInfo: PeerInfo,
        peerSignPubKey: string
    ): void {
        const event: ServerPeerInfo = {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        };
        const recipient = this.connectionRepository.get(peerSignPubKey);

        if (recipient?.readyState === WebSocket.OPEN) {
            this.notificationService.sendEvent(recipient, event);
        } else {
            this.userEventQueue.push(peerSignPubKey, event);
        }
    }

    private sendOrQueue(
        peer: Peer,
        event: ServerMessage,
        signPubKey: string
    ): void {
        if (peer.readyState === WebSocket.OPEN) {
            this.notificationService.sendEvent(peer, event);
        } else {
            this.userEventQueue.push(signPubKey, event);
        }
    }
}
