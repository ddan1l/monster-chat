import { ref } from "vue";

export function usePeerPresence() {
    const isPeerOnline = ref(false);
    const peerLastSeen = ref<number | null>(null);

    function onPeerOnline(): void {
        isPeerOnline.value = true;
        peerLastSeen.value = null;
    }

    function onPeerOffline(): void {
        isPeerOnline.value = false;
        peerLastSeen.value = Date.now();
    }

    return { isPeerOnline, peerLastSeen, onPeerOnline, onPeerOffline };
}
