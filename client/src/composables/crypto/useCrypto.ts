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

    async function computeSafetyNumber(
        theirSignPubKeyBase64: string
    ): Promise<string> {
        const myRaw = await crypto.subtle.exportKey(
            "raw",
            signKeyPair.value!.publicKey
        );
        const theirRaw = fromBase64(theirSignPubKeyBase64);

        const my = new Uint8Array(myRaw);
        const their = new Uint8Array(theirRaw);

        // Sort deterministically so both sides compute the same number
        let first: Uint8Array, second: Uint8Array;
        let decided = false;
        for (let i = 0; i < Math.min(my.length, their.length); i++) {
            if (my[i] < their[i]) {
                first = my;
                second = their;
                decided = true;
                break;
            }
            if (my[i] > their[i]) {
                first = their;
                second = my;
                decided = true;
                break;
            }
        }
        if (!decided) {
            first = my;
            second = their;
        }

        const combined = new Uint8Array(first!.length + second!.length);
        combined.set(first!);
        combined.set(second!, first!.length);

        const hash = new Uint8Array(
            await crypto.subtle.digest("SHA-256", combined)
        );

        // Convert to 12 groups of 5 decimal digits (like Signal)
        let n = 0n;
        for (const byte of hash) n = (n << 8n) | BigInt(byte);

        const groups: string[] = [];
        for (let i = 0; i < 12; i++) {
            groups.unshift(String(n % 100000n).padStart(5, "0"));
            n /= 100000n;
        }
        return groups.join(" ");
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
        decrypt,
        computeSafetyNumber,
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
