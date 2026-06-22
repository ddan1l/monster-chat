import { WebSocket } from "ws";

import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import { PendingChatInMemoryRepository } from "../repositories/PendingChatInMemoryRepository.js";

import { NotificationService } from "./NotificationService.js";

import type { ChatMessageQueue } from "../queues/ChatMessageQueue.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { Peer } from "../types.js";
import type {
    ChatMessage,
    PeerInfo,
    ServerError,
    ServerChatOpened,
    ServerChatCreated,
    ServerPeerInfo,
    ServerMessageDelivery,
    ServerReadReceipt,
    ServerMessage,
} from "shared";

export class ChatService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private queueRepository: ChatMessageQueue,
        private pendingChatRepository: PendingChatInMemoryRepository,
        private notificationService: NotificationService,
        private userEventQueue: UserEventQueue
    ) {}

    join(chatId: string, signPubKey: string, peer: Peer): void {
        peer.chatId = chatId;

        const pending = this.queueRepository.flush(`${chatId}:${signPubKey}`);
        pending.forEach((msg) => {
            const delivery: ServerMessageDelivery = {
                type: "message",
                payload: msg,
            };
            this.notificationService.send(peer, delivery);
        });

        const joined: ServerChatOpened = { type: "chat_opened" };
        this.notificationService.send(peer, joined);
    }

    deliver(chatId: string, payload: ChatMessage): void {
        const delivery: ServerMessageDelivery = { type: "message", payload };
        const recipientKey = payload.to;
        const recipient = this.connectionRepository.get(recipientKey);

        if (
            recipient?.readyState === WebSocket.OPEN &&
            recipient.chatId === chatId
        ) {
            this.notificationService.send(recipient, delivery);
        } else {
            this.queueRepository.push(`${chatId}:${recipientKey}`, payload);
        }
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
            this.notificationService.send(knockerPeer, error);
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
            this.notificationService.send(peer, error);
            return;
        }

        const knock = pending.knock;
        this.pendingChatRepository.remove(chatId);

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

    relayReadReceipt(chatId: string, nonce: string, sender: Peer): void {
        const event: ServerReadReceipt = {
            type: "read_receipt",
            payload: { chatId, nonce },
        };
        const recipientKey = this.connectionRepository
            .getAll()
            .find(
                (p) =>
                    p !== sender &&
                    p.readyState === WebSocket.OPEN &&
                    p.chatId === chatId
            )?.signPubKey;

        if (recipientKey) {
            const recipient = this.connectionRepository.get(recipientKey);
            if (recipient) this.notificationService.send(recipient, event);
        }
    }

    relayPeerInfo(
        chatId: string,
        sender: Peer,
        peerInfo: PeerInfo,
        peerSignPubKey: string
    ): void {
        const event: ServerPeerInfo = {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        };
        const recipient = this.connectionRepository.get(peerSignPubKey);

        if (recipient?.readyState === WebSocket.OPEN) {
            this.notificationService.send(recipient, event);
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
            this.notificationService.send(peer, event);
        } else {
            this.userEventQueue.push(signPubKey, event);
        }
    }
}
