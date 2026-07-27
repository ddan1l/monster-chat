import type { DevicePrekey } from "shared";

// Реестр устройств аккаунта (модель A): один signPubKey — много deviceId.
// Нужен для веерной доставки, per-device очередей (Ф3) и эпохальных prekey (Ф4).
export interface DeviceRepository {
    // Регистрирует/обновляет устройство аккаунта (идемпотентно).
    add(signPubKey: string, deviceId: string): void;
    // Все известные устройства аккаунта.
    getDevices(signPubKey: string): string[];
    remove(signPubKey: string, deviceId: string): void;
    // Публикует/обновляет текущий эпохальный prekey устройства (FS).
    setPrekey(
        signPubKey: string,
        deviceId: string,
        epochId: number,
        epochPub: string,
        signature: string
    ): void;
    // Текущие prekey всех устройств аккаунта — отправитель шифрует под каждый.
    getPrekeys(signPubKey: string): DevicePrekey[];
}
