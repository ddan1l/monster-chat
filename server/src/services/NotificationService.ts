import webpush from "web-push";
import { WebSocket } from "ws";

import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { PushSubscriptionRepository } from "../repositories/PushSubscriptionRepository.js";
import type { Peer } from "../types.js";
import type { ServerMessage, ServerNotification } from "shared";

export class NotificationService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private userEventQueue: UserEventQueue,
        private pushSubscriptions: PushSubscriptionRepository
    ) {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidEmail = process.env.VAPID_EMAIL ?? "mailto:admin@localhost";
        if (vapidPublicKey && vapidPrivateKey) {
            webpush.setVapidDetails(
                vapidEmail,
                vapidPublicKey,
                vapidPrivateKey
            );
        }
    }

    sendEvent(peer: Peer, msg: ServerMessage): void {
        peer.send(JSON.stringify(msg));
    }

    notify(recipientKey: string, chatId: string): void {
        const recipient = this.connectionRepository.get(recipientKey);

        if (recipient?.readyState === WebSocket.OPEN) {
            const notification: ServerNotification = {
                type: "notification",
                payload: { chatId, notificationType: "chat_notification" },
            };
            this.sendEvent(recipient, notification);
        } else {
            console.log(
                "[Notify] recipient offline, sending WebPush for",
                recipientKey.slice(0, 20)
            );
            this.sendWebPush(recipientKey, chatId);
        }
    }

    private sendWebPush(signPubKey: string, chatId: string): void {
        const subs = this.pushSubscriptions.findAll(signPubKey);
        console.log(
            "[WebPush] subs found:",
            subs.length,
            "for key",
            signPubKey.slice(0, 20)
        );
        if (!subs.length) return;

        const payload = JSON.stringify({
            title: "Monster Chat",
            body: "Новое сообщение(WEBPUSH)",
            chatId,
        });

        for (const sub of subs) {
            webpush
                .sendNotification(sub as webpush.PushSubscription, payload)
                .then((res) => {
                    console.log("[WebPush] sent ok, status:", res.statusCode);
                })
                .catch((err) => {
                    console.error(
                        "[WebPush] send failed",
                        err.statusCode,
                        err.body,
                        sub.endpoint
                    );
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        this.pushSubscriptions.remove(
                            signPubKey,
                            sub.endpoint!
                        );
                    }
                });
        }
    }
}
