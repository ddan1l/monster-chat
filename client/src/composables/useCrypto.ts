import { ref } from "vue";
import { useIndexedDb, STORES } from "./useIndexedDb";

const IDENTITY_PAIR_ID = "identity-pair";

export function useCrypto() {
    const keyPair = ref<CryptoKeyPair | null>(null);
    const { read, write } = useIndexedDb(STORES.KEYS);

    async function init() {
        let existingPair = await read<CryptoKeyPair>(IDENTITY_PAIR_ID);

        if (!existingPair) {
            existingPair = await crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                false,
                ["deriveKey"]
            );
            await write(existingPair, IDENTITY_PAIR_ID);
        }

        keyPair.value = existingPair;
    }

    async function exportPublicKey(): Promise<ArrayBuffer> {
        return crypto.subtle.exportKey("raw", keyPair.value!.publicKey);
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
            keyPair.value!.privateKey,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function hasKeys(): Promise<boolean> {
        return (await read<CryptoKeyPair>(IDENTITY_PAIR_ID)) !== null;
    }

    return { keyPair, hasKeys, init, exportPublicKey, deriveSharedKey };
}
