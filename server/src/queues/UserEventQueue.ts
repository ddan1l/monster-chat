import type { ServerMessage } from "shared";

// Очередь оффлайн-событий per-device: каждое устройство аккаунта забирает свою
// очередь при подключении (deviceId "" — легаси/аккаунт-фолбэк, забирает первый).
export interface UserEventQueue {
    push(userId: string, deviceId: string, event: ServerMessage): void;
    flush(userId: string, deviceId: string): ServerMessage[];
}
