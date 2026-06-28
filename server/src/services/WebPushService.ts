import webpush from "web-push";

import type { PushService } from "./PushService.js";
import type { PushSubscriptionRepository } from "../repositories/PushSubscriptionRepository.js";

export class WebPushService implements PushService {
    constructor(private subscriptions: PushSubscriptionRepository) {
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

    notify(signPubKey: string, chatId: string): void {
        const subs = this.subscriptions.findAll(signPubKey);
        if (!subs.length) return;

        const payload = JSON.stringify({
            title: "Monster Chat",
            body: "Новое сообщение",
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
                        this.subscriptions.remove(signPubKey, sub.endpoint!);
                    }
                });
        }
    }
}
