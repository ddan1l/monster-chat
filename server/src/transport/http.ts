import { type Server } from "http";

import cors from "cors";
import express from "express";

import { pushSubscriptions } from "../container.js";
import { fileRoutes } from "../routes/files.js";
import { pushRoutes } from "../routes/push.js";

export function attachHttp(server: Server) {
    const app = express();
    app.use(express.json());
    app.use(
        cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" })
    );

    app.use("/api/files", fileRoutes);
    app.use("/api/push", pushRoutes(pushSubscriptions));

    server.on("request", app);
}
