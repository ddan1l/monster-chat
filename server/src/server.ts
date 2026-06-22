import "dotenv/config";
import { createServer } from "http";

import { attachHttp } from "./transport/http.js";
import { attachWebSocket } from "./transport/websocket.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer();

attachWebSocket(server);
attachHttp(server);

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
