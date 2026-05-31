import { Router } from "express";
import express from "express";
import { fileService } from "../container.js";

const router = Router();

router.post(
    "/:chatId",
    express.raw({ type: "application/octet-stream", limit: "100mb" }),
    (req, res) => {
        const { chatId } = req.params;
        const signPubKey = req.headers["x-sign-key"] as string;

        if (!signPubKey) {
            res.status(400).json({ error: "X-Sign-Key header required" });
            return;
        }

        if (!fileService.isAuthorized(chatId, signPubKey)) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }

        const fileId = fileService.save(chatId, req.body as Buffer);
        res.json({ fileUrl: `/api/files/${chatId}/${fileId}` });
    }
);

router.get("/:chatId/:fileId", (req, res) => {
    const { chatId, fileId } = req.params;
    try {
        const data = fileService.read(chatId, fileId);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(data);
    } catch {
        res.status(404).json({ error: "Not found" });
    }
});

export { router as fileRoutes };
