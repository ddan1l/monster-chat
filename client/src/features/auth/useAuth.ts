import { ref } from "vue";

import { useCrypto } from "@shared/crypto/useCrypto";

import { useKeyStorage, type AuthMethod } from "./useKeyStorage";
import { useKeyWrap } from "./useKeyWrap";
import { useSession } from "./useSession";

export type { AuthMethod };

const PRF_SALT = new TextEncoder().encode(
    "monster-chat-keys-v1"
) as Uint8Array<ArrayBuffer>;

const MAX_ATTEMPTS = 5;
const FAIL_KEY = "_sc_fc";
const UNTIL_KEY = "_sc_lu";

// Module-level so lockout state is shared across all useAuth() calls
const failCount = ref(parseInt(localStorage.getItem(FAIL_KEY) ?? "0", 10));
const lockoutUntil = ref(parseInt(localStorage.getItem(UNTIL_KEY) ?? "0", 10));

function checkLockout(): void {
    if (Date.now() < lockoutUntil.value) {
        const secs = Math.ceil((lockoutUntil.value - Date.now()) / 1000);
        throw new Error(`LOCKED:${secs}`);
    }
}

function recordFailure(): void {
    failCount.value++;
    localStorage.setItem(FAIL_KEY, String(failCount.value));
    if (failCount.value >= MAX_ATTEMPTS) {
        // 30s → 60s → 120s → … → max 1h
        const extra = failCount.value - MAX_ATTEMPTS;
        const delaySec = Math.min(30 * Math.pow(2, extra), 3600);
        lockoutUntil.value = Date.now() + delaySec * 1000;
        localStorage.setItem(UNTIL_KEY, String(lockoutUntil.value));
    }
}

function resetLockout(): void {
    failCount.value = 0;
    lockoutUntil.value = 0;
    localStorage.removeItem(FAIL_KEY);
    localStorage.removeItem(UNTIL_KEY);
}

export function useAuth() {
    const { generateKeyPairs, setKeys, encryptionKeyPair, signKeyPair } =
        useCrypto();
    const storage = useKeyStorage();
    const { randomBytes, importAesGcm, deriveFromPin } = useKeyWrap();
    const session = useSession();

    async function registerPrf(name: string): Promise<void> {
        const credential = (await navigator.credentials.create({
            publicKey: {
                challenge: randomBytes(32),
                rp: { name: "Monster Chat" },
                user: { id: randomBytes(16), name, displayName: name },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 },
                    { type: "public-key", alg: -257 },
                ],
                authenticatorSelection: {
                    userVerification: "required",
                    authenticatorAttachment: "platform",
                },
                extensions: { prf: { eval: { first: PRF_SALT } } },
            },
        })) as PublicKeyCredential;

        const prfResult = credential.getClientExtensionResults().prf;
        if (!prfResult?.enabled && !prfResult?.results?.first) {
            throw new Error("PRF not supported by this authenticator");
        }

        let prfOutput: BufferSource;
        if (prfResult.results?.first) {
            prfOutput = prfResult.results.first;
        } else {
            const assertion = (await navigator.credentials.get({
                publicKey: {
                    challenge: randomBytes(32),
                    allowCredentials: [
                        { type: "public-key", id: credential.rawId },
                    ],
                    userVerification: "required",
                    extensions: { prf: { eval: { first: PRF_SALT } } },
                },
            })) as PublicKeyCredential;

            const output =
                assertion.getClientExtensionResults().prf?.results?.first;
            if (!output) throw new Error("PRF output not returned");
            prfOutput = output;
        }

        const { ecdh, sign } = await generateKeyPairs();
        const wrappingKey = await importAesGcm(prfOutput);
        await storage.storeEncryptedKeys(ecdh, sign, wrappingKey, "prf");
        await storage.storePublicKeys(ecdh, sign);
        await storage.storeCredentialId(new Uint8Array(credential.rawId));
        await storage.setAuthMethods(["prf"]);
        setKeys(ecdh, sign);
        await session.save(ecdh, sign);
    }

    async function registerPassword(password: string): Promise<void> {
        const { ecdh, sign } = await generateKeyPairs();
        const salt = randomBytes(16);
        const wrappingKey = await deriveFromPin(password, salt);
        await storage.storeEncryptedKeys(ecdh, sign, wrappingKey, "pin");
        await storage.storePublicKeys(ecdh, sign);
        await storage.storePinSalt(salt);
        await storage.setAuthMethods(["pin"]);
        setKeys(ecdh, sign);
        await session.save(ecdh, sign);
    }

    async function addPasswordFallback(password: string): Promise<void> {
        if (!encryptionKeyPair.value || !signKeyPair.value) {
            throw new Error("Keys not loaded");
        }
        const salt = randomBytes(16);
        const wrappingKey = await deriveFromPin(password, salt);
        await storage.storeEncryptedKeys(
            encryptionKeyPair.value,
            signKeyPair.value,
            wrappingKey,
            "pin"
        );
        await storage.storePinSalt(salt);
        const methods = await storage.getAuthMethods();
        if (!methods.includes("pin")) {
            await storage.setAuthMethods([...methods, "pin"]);
        }
    }

    async function authenticate(): Promise<void> {
        const credentialId = await storage.getCredentialId();
        if (!credentialId) throw new Error("No WebAuthn credential stored");

        const assertion = (await navigator.credentials.get({
            publicKey: {
                challenge: randomBytes(32),
                allowCredentials: [{ type: "public-key", id: credentialId }],
                userVerification: "required",
                extensions: { prf: { eval: { first: PRF_SALT } } },
            },
        })) as PublicKeyCredential;

        const prfOutput =
            assertion.getClientExtensionResults().prf?.results?.first;
        if (!prfOutput) throw new Error("PRF output not returned");

        const wrappingKey = await importAesGcm(prfOutput);
        const { ecdh, sign } = await storage.loadKeys(wrappingKey, "prf");
        setKeys(ecdh, sign);
        await session.save(ecdh, sign);
    }

    async function authenticateWithPassword(password: string): Promise<void> {
        checkLockout();
        const salt = await storage.getPinSalt();
        if (!salt) throw new Error("No password salt stored");
        const wrappingKey = await deriveFromPin(password, salt);
        try {
            const { ecdh, sign } = await storage.loadKeys(wrappingKey, "pin");
            resetLockout();
            setKeys(ecdh, sign);
            await session.save(ecdh, sign);
        } catch (e) {
            if (e instanceof Error && e.message.startsWith("LOCKED:")) throw e;
            recordFailure();
            throw e;
        }
    }

    return {
        hasKeys: storage.hasKeys,
        getAuthMethods: storage.getAuthMethods,
        registerPrf,
        registerPassword,
        addPasswordFallback,
        authenticate,
        authenticateWithPassword,
        restoreFromSession: session.restore,
        clearSession: session.clear,
        failCount,
        lockoutUntil,
        maxAttempts: MAX_ATTEMPTS,
    };
}
