import { useWs } from "@shared/transport/useWs";

import type { DevicePrekey } from "shared";

const TIMEOUT_MS = 5000;

// Запрашивает эпохальные prekey всех устройств аккаунта (get_prekeys) и ждёт
// ответ prekeys. Отправитель шифрует сообщение под каждый.
export function usePrekeys() {
    const { send, subscribe } = useWs();

    function fetchPrekeys(signPubKey: string): Promise<DevicePrekey[]> {
        return new Promise((resolve) => {
            let done = false;
            const finish = (devices: DevicePrekey[]) => {
                if (done) {
                    return;
                }
                done = true;
                unsub();
                resolve(devices);
            };
            const unsub = subscribe("prekeys", (msg) => {
                if (msg.payload.signPubKey === signPubKey) {
                    finish(msg.payload.devices);
                }
            });
            send({ type: "get_prekeys", payload: { signPubKey } });
            // Нет ответа за таймаут — пустой список (никому не отправим).
            setTimeout(() => finish([]), TIMEOUT_MS);
        });
    }

    return { fetchPrekeys };
}
