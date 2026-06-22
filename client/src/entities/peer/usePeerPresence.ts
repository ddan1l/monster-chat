import { computed, ref, watch } from "vue";

import { onlineStatus } from "./usePeers";

export function usePeerPresence(chatId: string) {
    const isPeerOnline = computed(() => onlineStatus.value[chatId] ?? false);
    const peerLastSeen = ref<number | null>(null);

    watch(isPeerOnline, (online) => {
        if (!online) peerLastSeen.value = Date.now();
        else peerLastSeen.value = null;
    });

    return { isPeerOnline, peerLastSeen };
}
