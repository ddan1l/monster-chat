import { ref } from "vue";
import { useIndexedDb, STORES } from "./useIndexedDb";

const encryptionKeyPair = ref<CryptoKeyPair | null>(null);
const signKeyPair = ref<CryptoKeyPair | null>(null);

export function useCrypto() {
    const { read, write } = useIndexedDb(STORES.KEYS);

    // =========================
    // INIT
    // =========================
    async function init() {
        // 1. ECDH keypair (encryption identity)
        let existingECDH = await read<CryptoKeyPair>("ecdh_key");

        if (!existingECDH) {
            existingECDH = await crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                false,
                ["deriveKey"]
            );

            await write(existingECDH, "ecdh_key");
        }

        encryptionKeyPair.value = existingECDH;

        // 2. ECDSA keypair (signature identity)
        let existingSign = await read<CryptoKeyPair>("sign_key");

        if (!existingSign) {
            existingSign = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256",
                },
                false,
                ["sign", "verify"]
            );

            await write(existingSign, "sign_key");
        }

        signKeyPair.value = existingSign;
    }

    // =========================
    // IDENTITY EXPORT
    // =========================
    async function exportEncryptionPublicKey(): Promise<string> {
        const raw = await crypto.subtle.exportKey(
            "raw",
            encryptionKeyPair.value!.publicKey
        );
        return btoa(String.fromCharCode(...new Uint8Array(raw)));
    }

    async function exportSignPublicKey(): Promise<string> {
        const raw = await crypto.subtle.exportKey(
            "raw",
            signKeyPair.value!.publicKey
        );
        return btoa(String.fromCharCode(...new Uint8Array(raw)));
    }

    // =========================
    // ECDH → SHARED KEY
    // =========================
    async function deriveSharedKey(theirPublicKeyRaw: ArrayBuffer) {
        const theirPublicKey = await crypto.subtle.importKey(
            "raw",
            theirPublicKeyRaw,
            {
                name: "ECDH",
                namedCurve: "P-256",
            },
            false,
            []
        );

        return crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: theirPublicKey,
            },
            encryptionKeyPair.value!.privateKey,
            {
                name: "AES-GCM",
                length: 256,
            },
            false,
            ["encrypt", "decrypt"]
        );
    }

    // =========================
    // ENCRYPT / DECRYPT
    // =========================
    async function encrypt(
        key: CryptoKey,
        data: string
    ): Promise<{ payload: ArrayBuffer; iv: Uint8Array }> {
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const payload = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv,
            },
            key,
            new TextEncoder().encode(data)
        );

        return { payload, iv };
    }

    async function decrypt(
        key: CryptoKey,
        payload: ArrayBuffer,
        iv: Uint8Array<ArrayBuffer>
    ): Promise<string> {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv,
            },
            key,
            payload
        );

        return new TextDecoder().decode(decrypted);
    }

    // =========================
    // SIGN / VERIFY
    // =========================
    async function sign(data: BufferSource): Promise<ArrayBuffer> {
        return crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: "SHA-256",
            },
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
            {
                name: "ECDSA",
                namedCurve: "P-256",
            },
            false,
            ["verify"]
        );

        return crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: "SHA-256",
            },
            publicKey,
            signature,
            data
        );
    }

    // =========================
    // UTILS
    // =========================
    async function hasKeys(): Promise<boolean> {
        return (await read("ecdh_key")) !== null;
    }

    return {
        encryptionKeyPair,
        signKeyPair,

        init,
        hasKeys,

        exportEncryptionPublicKey,
        exportSignPublicKey,

        deriveSharedKey,

        encrypt,
        decrypt,

        sign,
        verify,

        toBase64,
        fromBase64,
    };
}

export function toBase64(buf: ArrayBuffer | Uint8Array): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function fromBase64(s: string): ArrayBuffer {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
}
