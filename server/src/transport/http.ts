import { type Server } from "http";
import express from "express";
import cors from "cors";
import { fileRoutes } from "../routes/files.js";

export function attachHttp(server: Server) {
    const app = express();
    app.use(express.json());
    app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));

    app.use("/api/files", fileRoutes);

    server.on("request", app);
}
