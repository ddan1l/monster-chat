import { ref } from "vue";

const encryptionKeyPair = ref<CryptoKeyPair | null>(null);
const signKeyPair = ref<CryptoKeyPair | null>(null);

export function useCrypto() {
    async function generateKeyPairs(): Promise<{
        ecdh: CryptoKeyPair;
        sign: CryptoKeyPair;
    }> {
        const [ecdh, sign] = await Promise.all([
            crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey"]
            ),
            crypto.subtle.generateKey(
                { name: "ECDSA", namedCurve: "P-256" },
                true,
                ["sign", "verify"]
            ),
        ]);
        return { ecdh, sign };
    }

    function setKeys(ecdh: CryptoKeyPair, sign: CryptoKeyPair): void {
        encryptionKeyPair.value = ecdh;
        signKeyPair.value = sign;
    }

    async function exportPublicKey(key: CryptoKey): Promise<string> {
        const raw = await crypto.subtle.exportKey("raw", key);
        return toBase64(raw);
    }

    async function exportEncryptionPublicKey(): Promise<string> {
        return exportPublicKey(encryptionKeyPair.value!.publicKey);
    }

    async function exportSignPublicKey(): Promise<string> {
        return exportPublicKey(signKeyPair.value!.publicKey);
    }

    async function deriveSharedKey(
        theirPublicKeyRaw: ArrayBuffer
    ): Promise<CryptoKey> {
        const theirPublicKey = await crypto.subtle.importKey(
            "raw",
            theirPublicKeyRaw,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            []
        );
        return crypto.subtle.deriveKey(
            { name: "ECDH", public: theirPublicKey },
            encryptionKeyPair.value!.privateKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function encrypt(
        key: CryptoKey,
        data: string
    ): Promise<{ payload: ArrayBuffer; iv: Uint8Array }> {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const payload = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            new TextEncoder().encode(data)
        );
        return { payload, iv };
    }

    async function encryptBytes(data: ArrayBuffer): Promise<{
        encrypted: ArrayBuffer;
        keyRaw: ArrayBuffer;
        iv: Uint8Array;
    }> {
        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const [encrypted, keyRaw] = await Promise.all([
            crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data),
            crypto.subtle.exportKey("raw", key),
        ]);
        return { encrypted, keyRaw, iv };
    }

    async function decryptBytes(
        data: ArrayBuffer,
        keyRaw: ArrayBuffer,
        iv: ArrayBuffer
    ): Promise<ArrayBuffer> {
        const key = await crypto.subtle.importKey(
            "raw",
            keyRaw,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );
        return crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            key,
            data
        );
    }

    async function decrypt(
        key: CryptoKey,
        payload: ArrayBuffer,
        iv: Uint8Array<ArrayBuffer>
    ): Promise<string> {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            payload
        );
        return new TextDecoder().decode(decrypted);
    }

    async function sign(data: BufferSource): Promise<ArrayBuffer> {
        return crypto.subtle.sign(
            { name: "ECDSA", hash: "SHA-256" },
            signKeyPair.value!.privateKey,
            data
        );
    }

    async function verify(
        publicKeyRaw: BufferSource,
        data: BufferSource,
        signature: BufferSource
    ): Promise<boolean> {
        const publicKey = await crypto.subtle.importKey(
            "raw",
            publicKeyRaw,
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["verify"]
        );
        return crypto.subtle.verify(
            { name: "ECDSA", hash: "SHA-256" },
            publicKey,
            signature,
            data
        );
    }

    return {
        encryptionKeyPair,
        signKeyPair,
        generateKeyPairs,
        setKeys,
        exportEncryptionPublicKey,
        exportSignPublicKey,
        deriveSharedKey,
        encrypt,
        encryptBytes,
        decrypt,
        decryptBytes,
        sign,
        verify,
        toBase64,
        fromBase64,
    };
}

export function toBase64(buf: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buf);
    // Конвертируем чанками: спред всего массива в String.fromCharCode
    // переполняет стек на больших вложениях.
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

export function fromBase64(s: string): ArrayBuffer {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
}
