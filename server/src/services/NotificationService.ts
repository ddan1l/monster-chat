import webpush from "web-push";
import { WebSocket } from "ws";

import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { DeviceRepository } from "../repositories/DeviceRepository.js";
import type { PushSubscriptionRepository } from "../repositories/PushSubscriptionRepository.js";
import type { Peer } from "../types.js";
import type { ServerMessage, ServerNotification } from "shared";

export class NotificationService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private userEventQueue: UserEventQueue,
        private pushSubscriptions: PushSubscriptionRepository,
        private deviceRepository: DeviceRepository
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

    // Durable-событие на аккаунт: каждому устройству из реестра — live, если оно
    // онлайн, иначе в ЕГО очередь (заберёт при подключении). Так событие доходит
    // до всех устройств, даже если часть онлайн, а часть офлайн.
    deliverToAccount(accountKey: string, event: ServerMessage): void {
        const deviceIds = this.deviceRepository.getDevices(accountKey);
        if (deviceIds.length === 0) {
            this.userEventQueue.push(accountKey, "", event);
            return;
        }
        for (const deviceId of deviceIds) {
            const conn = this.connectionRepository.getDevice(
                accountKey,
                deviceId
            );
            if (conn?.readyState === WebSocket.OPEN) {
                this.sendEvent(conn, event);
            } else {
                this.userEventQueue.push(accountKey, deviceId, event);
            }
        }
    }

    // Ephemeral-событие (presence/typing) — только живым устройствам аккаунта,
    // без очереди: протухшее присутствие бесполезно, при реконнекте пересчитается.
    fanLive(accountKey: string, event: ServerMessage): void {
        for (const conn of this.connectionRepository.getDevices(accountKey)) {
            if (conn.readyState === WebSocket.OPEN) this.sendEvent(conn, event);
        }
    }

    notify(recipientKey: string, chatId: string, unreadCount: number): void {
        const notification: ServerNotification = {
            type: "notification",
            payload: {
                chatId,
                notificationType: "chat_notification",
                unreadCount,
            },
        };

        // Веер на все живые устройства аккаунта; web-push — только если ни одно
        // не подключено.
        let deliveredLive = false;
        for (const conn of this.connectionRepository.getDevices(recipientKey)) {
            if (conn.readyState === WebSocket.OPEN) {
                this.sendEvent(conn, notification);
                deliveredLive = true;
            }
        }
        if (!deliveredLive) {
            this.sendWebPush(recipientKey, chatId);
        }
    }

    private sendWebPush(signPubKey: string, chatId: string): void {
        const subs = this.pushSubscriptions.findAll(signPubKey);
        if (!subs.length) return;

        const payload = JSON.stringify({
            title: "Monster Chat",
            body: "Новое сообщение(WEBPUSH)",
            chatId,
        });

        for (const sub of subs) {
            webpush
                .sendNotification(sub as webpush.PushSubscription, payload)
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
