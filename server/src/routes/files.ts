import express, { Router } from "express";

import { chatMemberRepository, fileService } from "../container.js";
import { requireSignature, type AuthedRequest } from "../httpAuth.js";

const router = Router();

router.post(
    "/:chatId",
    requireSignature,
    express.raw({ type: "application/octet-stream", limit: "100mb" }),
    (req, res) => {
        const chatId = req.params.chatId as string;
        const signPubKey = (req as AuthedRequest).signPubKey!;

        if (!chatMemberRepository.isMember(chatId, signPubKey)) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        const fileId = fileService.save(chatId, req.body as Buffer);
        res.json({ fileUrl: `/api/files/${chatId}/${fileId}` });
    }
);

router.get("/:chatId/:fileId", requireSignature, (req, res) => {
    const chatId = req.params.chatId as string;
    const fileId = req.params.fileId as string;
    const signPubKey = (req as AuthedRequest).signPubKey!;

    if (!chatMemberRepository.isMember(chatId, signPubKey)) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }

    try {
        const data = fileService.read(chatId, fileId);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(data);
    } catch {
        res.status(404).json({ error: "Not found" });
    }
});

export { router as fileRoutes };
