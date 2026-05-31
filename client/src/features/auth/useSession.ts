import { useCrypto, toBase64, fromBase64 } from "@shared/crypto/useCrypto";

const KEYS = ["_sc_ep", "_sc_eu", "_sc_sp", "_sc_su"] as const;

export function useSession() {
    const { setKeys } = useCrypto();

    async function save(
        ecdhPair: CryptoKeyPair,
        signPair: CryptoKeyPair
    ): Promise<void> {
        const [ecdhPriv, ecdhPub, signPriv, signPub] = await Promise.all([
            crypto.subtle.exportKey("pkcs8", ecdhPair.privateKey),
            crypto.subtle.exportKey("raw", ecdhPair.publicKey),
            crypto.subtle.exportKey("pkcs8", signPair.privateKey),
            crypto.subtle.exportKey("raw", signPair.publicKey),
        ]);
        const [ep, eu, sp, su] = KEYS;
        sessionStorage.setItem(ep, toBase64(ecdhPriv));
        sessionStorage.setItem(eu, toBase64(ecdhPub));
        sessionStorage.setItem(sp, toBase64(signPriv));
        sessionStorage.setItem(su, toBase64(signPub));
    }

    async function restore(): Promise<boolean> {
        const [ep, eu, sp, su] = KEYS.map((k) => sessionStorage.getItem(k));
        if (!ep || !eu || !sp || !su) return false;
        try {
            const [ecdhPrivate, ecdhPublic, signPrivate, signPublic] =
                await Promise.all([
                    crypto.subtle.importKey(
                        "pkcs8",
                        fromBase64(ep),
                        { name: "ECDH", namedCurve: "P-256" },
                        true,
                        ["deriveKey"]
                    ),
                    crypto.subtle.importKey(
                        "raw",
                        fromBase64(eu),
                        { name: "ECDH", namedCurve: "P-256" },
                        true,
                        []
                    ),
                    crypto.subtle.importKey(
                        "pkcs8",
                        fromBase64(sp),
                        { name: "ECDSA", namedCurve: "P-256" },
                        true,
                        ["sign"]
                    ),
                    crypto.subtle.importKey(
                        "raw",
                        fromBase64(su),
                        { name: "ECDSA", namedCurve: "P-256" },
                        true,
                        ["verify"]
                    ),
                ]);
            setKeys(
                { privateKey: ecdhPrivate, publicKey: ecdhPublic },
                { privateKey: signPrivate, publicKey: signPublic }
            );
            return true;
        } catch {
            clear();
            return false;
        }
    }

    function clear(): void {
        KEYS.forEach((k) => sessionStorage.removeItem(k));
    }

    return { save, restore, clear };
}
