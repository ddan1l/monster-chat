import { computed, ref, watch } from "vue";

import { STORES, useIndexedDb } from "@shared/lib/useIndexedDb";

import { onlineStatus } from "./usePeers";

import type { StoredPeer } from "./usePeers";

export function usePeerPresence(chatId: string) {
    const { read } = useIndexedDb(STORES.PEERS);

    const isPeerOnline = computed(() => onlineStatus.value[chatId] ?? false);
    const peerLastSeen = ref<number | null>(null);

    read<StoredPeer>(chatId).then((stored) => {
        if (stored?.lastSeen && !isPeerOnline.value) {
            peerLastSeen.value = stored.lastSeen;
        }
    });

    watch(isPeerOnline, (online) => {
        if (!online) peerLastSeen.value = Date.now();
        else peerLastSeen.value = null;
    });

    return { isPeerOnline, peerLastSeen };
}
