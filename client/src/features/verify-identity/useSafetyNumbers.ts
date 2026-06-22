import { ref } from "vue";

import { useCrypto, fromBase64 } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

import type { PeerInfo } from "shared";

interface StoredPeer extends PeerInfo {
    verified?: boolean;
    keyChanged?: boolean;
}

async function computeSafetyNumber(
    mySignPubKey: CryptoKey,
    theirSignPubKeyBase64: string
): Promise<string> {
    const myRaw = await crypto.subtle.exportKey("raw", mySignPubKey);
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
    for (const byte of hash) {
        n = (n << 8n) | BigInt(byte);
    }

    const groups: string[] = [];
    for (let i = 0; i < 12; i++) {
        groups.unshift(String(n % 100000n).padStart(5, "0"));
        n /= 100000n;
    }
    return groups.join(" ");
}

export function useSafetyNumbers(chatId: string) {
    const { read, write } = useIndexedDb(STORES.PEERS);
    const { signKeyPair } = useCrypto();

    const safetyNumber = ref<string | null>(null);
    const verified = ref<boolean | null>(null);
    const keyChanged = ref(false);

    async function load(peer: PeerInfo) {
        const stored = await read<StoredPeer>(chatId);
        verified.value = stored?.verified ?? false;
        keyChanged.value = stored?.keyChanged ?? false;
        safetyNumber.value = await computeSafetyNumber(
            signKeyPair.value!.publicKey,
            peer.signPubKey
        );
    }

    async function updatePeer(updates: Partial<StoredPeer>): Promise<void> {
        const stored = await read<StoredPeer>(chatId);
        if (stored) {
            await write({ ...stored, ...updates }, chatId);
        }
    }

    async function markVerified() {
        await updatePeer({ verified: true, keyChanged: false });
        verified.value = true;
        keyChanged.value = false;
    }

    async function removeVerification() {
        await updatePeer({ verified: false });
        verified.value = false;
    }

    return {
        safetyNumber,
        verified,
        keyChanged,
        load,
        markVerified,
        removeVerification,
    };
}
