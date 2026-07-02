import { type Server } from "http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import cors from "cors";
import express from "express";

const __dirname = dirname(fileURLToPath(import.meta.url));

import { pushSubscriptions } from "../container.js";
import { fileRoutes } from "../routes/files.js";
import { pushRoutes } from "../routes/push.js";
import { updatesRouter } from "../routes/updates.js";

export function attachHttp(server: Server) {
    const app = express();
    app.use(express.json());
    app.use(
        cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" })
    );

    app.use("/api/files", fileRoutes);
    app.use("/api/push", pushRoutes(pushSubscriptions));
    app.use("/api/updates", updatesRouter);
    app.use("/releases", express.static(join(__dirname, "../../releases")));

    server.on("request", app);
}
