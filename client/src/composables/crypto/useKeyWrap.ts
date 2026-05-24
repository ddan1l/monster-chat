const PBKDF2_ITERATIONS = 600_000;

export function useKeyWrap() {
    function randomBytes(n: number): Uint8Array<ArrayBuffer> {
        return crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
    }

    async function importAesGcm(keyBytes: BufferSource): Promise<CryptoKey> {
        return crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function deriveFromPin(
        pin: string,
        salt: Uint8Array<ArrayBuffer>
    ): Promise<CryptoKey> {
        const pinKey = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(pin) as Uint8Array<ArrayBuffer>,
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256",
            },
            pinKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encryptKey(
        privateKey: CryptoKey,
        wrappingKey: CryptoKey
    ): Promise<{ data: ArrayBuffer; iv: Uint8Array<ArrayBuffer> }> {
        const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
        const iv = randomBytes(12);
        const data = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            wrappingKey,
            pkcs8
        );
        return { data, iv };
    }

    async function decryptKey(
        data: ArrayBuffer,
        iv: ArrayBuffer,
        wrappingKey: CryptoKey,
        algorithm: EcKeyImportParams,
        usages: KeyUsage[]
    ): Promise<CryptoKey> {
        const pkcs8 = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            wrappingKey,
            data
        );
        return crypto.subtle.importKey("pkcs8", pkcs8, algorithm, true, usages);
    }

    return { randomBytes, importAesGcm, deriveFromPin, encryptKey, decryptKey };
}
