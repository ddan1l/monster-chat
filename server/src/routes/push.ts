import { Router } from "express";

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

    router.post("/subscribe", (req, res) => {
        const { signPubKey, subscription } = req.body as {
            signPubKey: string;
            subscription: PushSubscriptionJSON;
        };

        if (!signPubKey || !subscription?.endpoint) {
            res.status(400).json({ error: "Invalid payload" });
            return;
        }

        subscriptions.save(signPubKey, subscription);
        res.status(201).json({ ok: true });
    });

    return router;
}
