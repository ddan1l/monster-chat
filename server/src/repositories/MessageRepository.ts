import type { ChatMessage } from "shared";

export interface MessageRepository {
    // Проставляет message.seq (серверный монотонный курсор) после вставки.
    save(message: ChatMessage): void;
    removeByChat(chatId: string): void;

    // Транзитная модель: устройство подтвердило курсором, что имеет всё до seq —
    // удаляем его копии с сервера (локальный стор клиента — дом истории).
    deleteDeviceDeliveredUpTo(
        chatId: string,
        deviceId: string,
        seq: number
    ): void;
    // TTL-бэкстоп: удаляет всё старше указанного времени (для устройств, которые
    // так и не вернулись подтвердить).
    deleteExpired(before: number): void;

    // v2 (FS): синк по копиям, адресованным конкретному устройству. Пагинация
    // вверх теперь целиком локальная (клиентский стор — дом истории), поэтому
    // getPage больше не нужен.
    getAfterForDevice(
        chatId: string,
        deviceId: string,
        afterSeq: number
    ): ChatMessage[];
}
