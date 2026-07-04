import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const metaPath = join(__dirname, "../../updates/latest.json");

const platformMap: Record<string, string> = {
    windows: "windows-x86_64",
    mac: "darwin-aarch64",
};

export const downloadRouter = Router();

downloadRouter.get("/:platform", (req, res) => {
    let meta: { platforms: Record<string, { url: string }> };
    try {
        meta = JSON.parse(readFileSync(metaPath, "utf-8"));
    } catch {
        res.status(503).end();
        return;
    }

    const key = platformMap[req.params.platform];
    const url = key && meta.platforms[key]?.url;

    if (!url) {
        res.status(404).end();
        return;
    }

    res.redirect(302, url);
});
