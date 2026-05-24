import { WebSocket } from "ws";
import type {
    ChatMessage,
    PeerInfo,
    ServerError,
    ServerChatOpened,
    ServerChatCreated,
    ServerChatKnock,
    ServerPeerInfo,
    ServerMessageDelivery,
    ServerReadReceipt,
    ServerMessage,
} from "shared";
import type { Peer } from "../types.js";
import { NotificationService } from "./NotificationService.js";
import type { ChatRepository } from "../repositories/ChatRepository.js";
import type { ChatMessageQueue } from "../queues/ChatMessageQueue.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import { PendingChatInMemoryRepository } from "../repositories/PendingChatInMemoryRepository.js";

export class ChatService {
    constructor(
        private chatRepository: ChatRepository,
        private connectionRepository: ConnectionInMemoryRepository,
        private queueRepository: ChatMessageQueue,
        private pendingChatRepository: PendingChatInMemoryRepository,
        private notificationService: NotificationService,
        private userEventQueue: UserEventQueue
    ) {}

    join(chatId: string, signPubKey: string, peer: Peer): void {
        if (!this.chatRepository.isAuthorized(chatId, signPubKey)) {
            const error: ServerError = {
                type: "error",
                message: "Not authorized to join this chat.",
            };
            this.notificationService.send(peer, error);
            return;
        }

        peer.chatId = chatId;

        // Flush messages queued while this participant was offline
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

    deliver(chatId: string, payload: ChatMessage, sender: Peer): void {
        const delivery: ServerMessageDelivery = { type: "message", payload };

        this.chatRepository
            .getAuthorizedKeys(chatId)
            .filter((k) => k !== sender.signPubKey)
            .forEach((key) => {
                const peer = this.connectionRepository.get(key);
                if (
                    peer?.readyState === WebSocket.OPEN &&
                    peer.chatId === chatId
                ) {
                    this.notificationService.send(peer, delivery);
                } else {
                    this.queueRepository.push(`${chatId}:${key}`, payload);
                }
            });
    }

    initChat(chatId: string, hostKey: string, peer: Peer): void {
        peer.signPubKey = hostKey;
        this.pendingChatRepository.add(chatId, hostKey, peer);
    }

    knockChat(
        chatId: string,
        hostKey: string,
        peerInfo: PeerInfo,
        knockerPeer: Peer
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

        const event: ServerChatKnock = {
            type: "chat_knock",
            payload: { chatId, peerInfo },
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

        // Register both participants as authorized before any open_chat arrives
        this.chatRepository.authorize(chatId, pending.hostKey);
        this.chatRepository.authorize(chatId, knock.knockerKey);

        const chatCreated: ServerChatCreated = {
            type: "chat_created",
            payload: { chatId },
        };
        this.sendOrQueue(peer, chatCreated, pending.hostKey);
        this.sendOrQueue(knock.peer, chatCreated, knock.knockerKey);

        // Deliver A's peerInfo directly to B
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
        const recipients = this.getOnlineRecipients(chatId, sender);
        recipients.forEach((p) => this.notificationService.send(p, event));
    }

    relayPeerInfo(chatId: string, sender: Peer, peerInfo: PeerInfo): void {
        const event: ServerPeerInfo = {
            type: "peer_info",
            payload: { ...peerInfo, chatId },
        };
        const recipients = this.getOnlineRecipients(chatId, sender);
        if (recipients.length > 0) {
            recipients.forEach((p) => this.notificationService.send(p, event));
        } else {
            this.chatRepository
                .getAuthorizedKeys(chatId)
                .filter((k) => k !== sender.signPubKey)
                .forEach((key) => this.userEventQueue.push(key, event));
        }
    }

    getParticipantIds(chatId: string): string[] {
        return this.chatRepository.getAuthorizedKeys(chatId);
    }

    private getOnlineRecipients(chatId: string, sender: Peer): Peer[] {
        return this.chatRepository
            .getAuthorizedKeys(chatId)
            .map((key) => this.connectionRepository.get(key))
            .filter(
                (p): p is Peer =>
                    p !== undefined &&
                    p !== sender &&
                    p.readyState === WebSocket.OPEN
            );
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
