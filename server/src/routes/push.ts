import { Router } from "express";

import { requireSignature, type AuthedRequest } from "../httpAuth.js";

import type { PushSubscriptionRepository } from "../repositories/PushSubscriptionRepository.js";

export function pushRoutes(subscriptions: PushSubscriptionRepository): Router {
    const router = Router();

    router.get("/vapid-public-key", (_req, res) => {
        const key = process.env.VAPID_PUBLIC_KEY;
        if (!key) {
            res.status(503).json({ error: "Web Push not configured" });
            return;
        }
        res.json({ key });
    });

    router.post("/subscribe", requireSignature, (req, res) => {
        // Ключ берём из подписанного запроса, а не из тела — нельзя подписать
        // чужой push-endpoint на чужой ключ.
        const signPubKey = (req as AuthedRequest).signPubKey!;
        const { subscription } = req.body as {
            subscription: PushSubscriptionJSON;
        };

        if (!subscription?.endpoint) {
            res.status(400).json({ error: "Invalid payload" });
            return;
        }

        subscriptions.save(signPubKey, subscription);
        res.status(201).json({ ok: true });
    });

    return router;
}
