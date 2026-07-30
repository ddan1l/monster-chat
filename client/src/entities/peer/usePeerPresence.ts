import { computed, ref, watch } from "vue";

import { onlineStatus, peers } from "./usePeers";

export function usePeerPresence(chatId: string) {
    const isPeerOnline = computed(() => onlineStatus.value[chatId] ?? false);
    const peerLastSeen = computed(() => {
        if (isPeerOnline.value) {
            return null;
        }
        return peers.value[chatId]?.lastSeen ?? null;
    });

    return { isPeerOnline, peerLastSeen };
}
