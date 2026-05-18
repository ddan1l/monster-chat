import "dotenv/config";
import { startServer } from "./transport/websocket.js";

startServer(3000);
