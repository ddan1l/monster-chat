const DEVICE_ID_KEY = "mc_device_id";

// Стабильный идентификатор устройства (модель A: один аккаунт signPubKey — много
// устройств). Генерится один раз на установку, переживает сессии. Различает
// соединения/очереди на сервере; на identity-ключи не влияет.
export function getDeviceId(): string {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}
