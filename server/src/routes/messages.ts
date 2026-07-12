import { Router } from "express";

import { chatMemberRepository, messageRepository } from "../container.js";
import { requireSignature, type AuthedRequest } from "../httpAuth.js";

export const messageRoutes = Router();

messageRoutes.get("/:chatId", requireSignature, (req, res) => {
    const signPubKey = (req as AuthedRequest).signPubKey!;
    const chatId = req.params.chatId as string;

    if (!chatMemberRepository.isMember(chatId, signPubKey)) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }

    const before =
        parseInt(req.query.before as string) || Number.MAX_SAFE_INTEGER;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const messages = messageRepository.getPage(
        chatId,
        signPubKey,
        before,
        limit
    );
    res.json(messages);
});
