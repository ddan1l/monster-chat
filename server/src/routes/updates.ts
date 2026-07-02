import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const metaPath = join(__dirname, "../../updates/latest.json");

export const updatesRouter = Router();

updatesRouter.get("/:target/:arch/:version", (req, res) => {
    let meta: { version: string };
    try {
        meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    } catch {
        res.status(503).end();
        return;
    }

    if (req.params.version === meta.version) {
        res.status(204).end();
        return;
    }

    res.json(meta);
});
