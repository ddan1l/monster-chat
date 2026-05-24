import { useCrypto } from "./useCrypto";

const KEYS = ["_sc_ep", "_sc_eu", "_sc_sp", "_sc_su"] as const;

export function useSession() {
    const { setKeys } = useCrypto();

    function ab2b64(buf: ArrayBuffer): string {
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }

    function b642ab(b64: string): ArrayBuffer {
        return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
            .buffer as ArrayBuffer;
    }

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
        sessionStorage.setItem(ep, ab2b64(ecdhPriv));
        sessionStorage.setItem(eu, ab2b64(ecdhPub));
        sessionStorage.setItem(sp, ab2b64(signPriv));
        sessionStorage.setItem(su, ab2b64(signPub));
    }

    async function restore(): Promise<boolean> {
        const [ep, eu, sp, su] = KEYS.map((k) => sessionStorage.getItem(k));
        if (!ep || !eu || !sp || !su) return false;
        try {
            const [ecdhPrivate, ecdhPublic, signPrivate, signPublic] =
                await Promise.all([
                    crypto.subtle.importKey(
                        "pkcs8",
                        b642ab(ep),
                        { name: "ECDH", namedCurve: "P-256" },
                        true,
                        ["deriveKey"]
                    ),
                    crypto.subtle.importKey(
                        "raw",
                        b642ab(eu),
                        { name: "ECDH", namedCurve: "P-256" },
                        true,
                        []
                    ),
                    crypto.subtle.importKey(
                        "pkcs8",
                        b642ab(sp),
                        { name: "ECDSA", namedCurve: "P-256" },
                        true,
                        ["sign"]
                    ),
                    crypto.subtle.importKey(
                        "raw",
                        b642ab(su),
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
