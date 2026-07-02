import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Router } from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));

const updatesMeta = JSON.parse(
    readFileSync(join(__dirname, "../../updates/latest.json"), "utf-8")
);

export const updatesRouter = Router();

updatesRouter.get("/:target/:arch/:version", (req, res) => {
    const { version } = req.params;

    if (version === updatesMeta.version) {
        res.status(204).end();
        return;
    }

    res.json(updatesMeta);
});
