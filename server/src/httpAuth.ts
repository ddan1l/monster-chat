import { verifySignature, encodeUtf8 } from "./crypto.js";

import type { Request, Response, NextFunction } from "express";

// Свежесть подписи: окно против replay.
const MAX_SKEW_MS = 5 * 60 * 1000;

export interface AuthedRequest extends Request {
    signPubKey?: string;
}

// Проверяет подпись запроса: клиент подписывает `METHOD path?query timestamp`
// своим ключом. Ключ становится доказанной личностью (req.signPubKey).
export function requireSignature(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const signKey = req.header("x-sign-key");
    const ts = req.header("x-timestamp");
    const sig = req.header("x-signature");

    if (!signKey || !ts || !sig) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const t = Number(ts);
    if (!Number.isFinite(t) || Math.abs(Date.now() - t) > MAX_SKEW_MS) {
        res.status(401).json({ error: "Stale request" });
        return;
    }

    const canonical = `${req.method} ${req.originalUrl} ${ts}`;
    verifySignature(signKey, encodeUtf8(canonical), sig)
        .then((ok) => {
            if (!ok) {
                res.status(401).json({ error: "Bad signature" });
                return;
            }
            (req as AuthedRequest).signPubKey = signKey;
            next();
        })
        .catch(() => res.status(401).json({ error: "Unauthorized" }));
}
