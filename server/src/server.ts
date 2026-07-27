import "dotenv/config";
import { createServer } from "http";

import { messageRepository } from "./container.js";
import { attachHttp } from "./transport/http.js";
import { attachWebSocket } from "./transport/websocket.js";

const port = Number(process.env.PORT ?? 3000);
const server = createServer();

attachWebSocket(server);
attachHttp(server);

// TTL-бэкстоп транзитной модели: раз в час чистим сообщения старше TTL (для
// устройств, которые так и не подтвердили получение курсором).
const MSG_TTL_MS = Number(process.env.MSG_TTL_MS ?? 30 * 24 * 60 * 60 * 1000);
setInterval(
    () => messageRepository.deleteExpired(Date.now() - MSG_TTL_MS),
    60 * 60 * 1000
).unref();

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
