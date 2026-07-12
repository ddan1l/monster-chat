import { webcrypto, randomBytes } from "node:crypto";

const { subtle } = webcrypto;

export function generateNonce(): string {
    return randomBytes(32).toString("base64");
}

export function decodeBase64(s: string): ArrayBuffer {
    const buf = Buffer.from(s, "base64");
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return ab;
}

export function encodeUtf8(s: string): ArrayBuffer {
    const buf = Buffer.from(s, "utf8");
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(buf);
    return ab;
}

// Проверяет ECDSA P-256 / SHA-256 подпись `data` против сырого (raw) публичного
// ключа — тот же формат, что экспортирует клиент.
export async function verifySignature(
    signPubKeyBase64: string,
    data: ArrayBuffer,
    signatureBase64: string
): Promise<boolean> {
    try {
        const key = await subtle.importKey(
            "raw",
            decodeBase64(signPubKeyBase64),
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["verify"]
        );
        return await subtle.verify(
            { name: "ECDSA", hash: "SHA-256" },
            key,
            decodeBase64(signatureBase64),
            data
        );
    } catch {
        return false;
    }
}
