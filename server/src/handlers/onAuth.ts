import { deviceRepository } from "../container.js";
import { verifySignature, decodeBase64 } from "../crypto.js";

import type { AuthMessage, Peer } from "../types.js";

export async function onAuth(ws: Peer, data: AuthMessage): Promise<void> {
    if (ws.authed || !ws.authNonce) return;

    const { signPubKey, signature, deviceId } = data.payload;
    const ok = await verifySignature(
        signPubKey,
        decodeBase64(ws.authNonce),
        signature
    );
    if (!ok) {
        ws.close(4401, "Auth failed");
        return;
    }

    ws.signPubKey = signPubKey;
    ws.deviceId = deviceId;
    ws.authed = true;
    ws.authNonce = undefined;
    // Устройство доказало владение ключом аккаунта — регистрируем в реестре.
    deviceRepository.add(signPubKey, deviceId);
    ws.send(JSON.stringify({ type: "authed" }));
}
