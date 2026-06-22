import { WebSocket } from "ws";

import type { NotificationService } from "./NotificationService.js";
import type { PushService } from "./PushService.js";
import type { UserEventQueue } from "../queues/UserEventQueue.js";
import type { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import type { ServerNotification } from "shared";

export class WsPushService implements PushService {
    constructor(
        private connectionRepository: ConnectionInMemoryRepository,
        private userEventQueue: UserEventQueue,
        private notificationService: NotificationService
    ) {}

    notify(signPubKey: string, chatId: string): void {
        const notification: ServerNotification = {
            type: "notification",
            payload: { chatId, notificationType: "chat_notification" },
        };

        const peer = this.connectionRepository.get(signPubKey);
        if (peer?.readyState === WebSocket.OPEN) {
            this.notificationService.send(peer, notification);
        } else {
            this.userEventQueue.push(signPubKey, notification);
        }
    }
}
