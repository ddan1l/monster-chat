import { ref } from "vue";
import type { PeerInfo } from "shared";
import { useIndexedDb, STORES } from "../infrastructure/useIndexedDb";
import { useCrypto } from "./useCrypto";

interface StoredPeer extends PeerInfo {
    verified?: boolean;
    keyChanged?: boolean;
}

export function useSafetyNumbers(chatId: string) {
    const { read, write } = useIndexedDb(STORES.PEERS);
    const { computeSafetyNumber } = useCrypto();

    const safetyNumber = ref<string | null>(null);
    const verified = ref(false);
    const keyChanged = ref(false);

    async function load(peer: PeerInfo) {
        const stored = await read<StoredPeer>(chatId);
        verified.value = stored?.verified ?? false;
        keyChanged.value = stored?.keyChanged ?? false;
        safetyNumber.value = await computeSafetyNumber(peer.signPubKey);
    }

    async function markVerified() {
        const stored = await read<StoredPeer>(chatId);
        if (stored) {
            await write(
                { ...stored, verified: true, keyChanged: false },
                chatId
            );
            verified.value = true;
            keyChanged.value = false;
        }
    }

    async function removeVerification() {
        const stored = await read<StoredPeer>(chatId);
        if (stored) {
            await write({ ...stored, verified: false }, chatId);
            verified.value = false;
        }
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
