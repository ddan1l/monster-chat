import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import { useKeyWrap } from "./useKeyWrap";

export type AuthMethod = "prf" | "pin";

export function useKeyStorage() {
    const { read, write } = useIndexedDb(STORES.KEYS);
    const { encryptKey, decryptKey } = useKeyWrap();

    async function hasKeys(): Promise<boolean> {
        return (await read("auth_methods")) !== null;
    }

    async function getAuthMethods(): Promise<AuthMethod[]> {
        return (await read<AuthMethod[]>("auth_methods")) ?? [];
    }

    async function setAuthMethods(methods: AuthMethod[]): Promise<void> {
        await write(methods, "auth_methods");
    }

    async function getCredentialId(): Promise<ArrayBuffer | null> {
        return read<ArrayBuffer>("webauthn_credential_id");
    }

    async function storeCredentialId(rawId: Uint8Array): Promise<void> {
        await write(rawId, "webauthn_credential_id");
    }

    async function getPinSalt(): Promise<Uint8Array<ArrayBuffer> | null> {
        return read<Uint8Array<ArrayBuffer>>("pin_salt");
    }

    async function storePinSalt(salt: Uint8Array<ArrayBuffer>): Promise<void> {
        await write(salt, "pin_salt");
    }

    async function storeEncryptedKeys(
        ecdhPair: CryptoKeyPair,
        signPair: CryptoKeyPair,
        wrappingKey: CryptoKey,
        method: AuthMethod
    ): Promise<void> {
        const [ecdhEnc, signEnc] = await Promise.all([
            encryptKey(ecdhPair.privateKey, wrappingKey),
            encryptKey(signPair.privateKey, wrappingKey),
        ]);
        await Promise.all([
            write(ecdhEnc.data, `ecdh_enc_${method}`),
            write(ecdhEnc.iv, `ecdh_iv_${method}`),
            write(signEnc.data, `sign_enc_${method}`),
            write(signEnc.iv, `sign_iv_${method}`),
        ]);
    }

    async function storePublicKeys(
        ecdhPair: CryptoKeyPair,
        signPair: CryptoKeyPair
    ): Promise<void> {
        const [ecdhPub, signPub] = await Promise.all([
            crypto.subtle.exportKey("raw", ecdhPair.publicKey),
            crypto.subtle.exportKey("raw", signPair.publicKey),
        ]);
        await Promise.all([
            write(ecdhPub, "ecdh_pub"),
            write(signPub, "sign_pub"),
        ]);
    }

    async function loadKeys(
        wrappingKey: CryptoKey,
        method: AuthMethod
    ): Promise<{ ecdh: CryptoKeyPair; sign: CryptoKeyPair }> {
        const [ecdhEnc, ecdhIv, signEnc, signIv, ecdhPub, signPub] =
            await Promise.all([
                read<ArrayBuffer>(`ecdh_enc_${method}`),
                read<ArrayBuffer>(`ecdh_iv_${method}`),
                read<ArrayBuffer>(`sign_enc_${method}`),
                read<ArrayBuffer>(`sign_iv_${method}`),
                read<ArrayBuffer>("ecdh_pub"),
                read<ArrayBuffer>("sign_pub"),
            ]);

        if (
            !ecdhEnc ||
            !ecdhIv ||
            !signEnc ||
            !signIv ||
            !ecdhPub ||
            !signPub
        ) {
            throw new Error("Incomplete key storage");
        }

        const [ecdhPrivate, signPrivate, ecdhPublic, signPublic] =
            await Promise.all([
                decryptKey(
                    ecdhEnc,
                    ecdhIv,
                    wrappingKey,
                    { name: "ECDH", namedCurve: "P-256" },
                    ["deriveKey"]
                ),
                decryptKey(
                    signEnc,
                    signIv,
                    wrappingKey,
                    { name: "ECDSA", namedCurve: "P-256" },
                    ["sign"]
                ),
                crypto.subtle.importKey(
                    "raw",
                    ecdhPub,
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    []
                ),
                crypto.subtle.importKey(
                    "raw",
                    signPub,
                    { name: "ECDSA", namedCurve: "P-256" },
                    true,
                    ["verify"]
                ),
            ]);

        return {
            ecdh: { privateKey: ecdhPrivate, publicKey: ecdhPublic },
            sign: { privateKey: signPrivate, publicKey: signPublic },
        };
    }

    return {
        hasKeys,
        getAuthMethods,
        setAuthMethods,
        getCredentialId,
        storeCredentialId,
        getPinSalt,
        storePinSalt,
        storeEncryptedKeys,
        storePublicKeys,
        loadKeys,
    };
}
