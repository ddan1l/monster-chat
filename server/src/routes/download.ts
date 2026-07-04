import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tauriConfPath = join(__dirname, "../../../client/src-tauri/tauri.conf.json");

const BASE = "https://megamonster.online/releases";

const platformFiles: Record<string, { dir: string; ext: string }> = {
    windows: { dir: "release-windows-x86_64", ext: "_x64-setup.exe" },
    mac: { dir: "release-darwin-aarch64", ext: "_aarch64.dmg" },
};

export const downloadRouter = Router();

downloadRouter.get("/:platform", (req, res) => {
    let version: string;
    try {
        const conf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
        version = conf.version;
    } catch {
        res.status(503).end();
        return;
    }

    const platform = platformFiles[req.params.platform];
    if (!platform) {
        res.status(404).end();
        return;
    }

    const filename = `MonsterChat_${version}${platform.ext}`;
    res.redirect(302, `${BASE}/${version}/${platform.dir}/${filename}`);
});
