import { computed } from "vue";

import { useWs } from "@shared/api/useWs";
import { useDebounce } from "@shared/lib/useDebounce";

import { peers, typingStatus } from "@entities/peer/usePeers";

export function useTypingIndicator(chatId: string) {
    const { send: wsSend } = useWs();

    const isPeerTyping = computed(() => typingStatus.value[chatId] ?? false);
    let isTypingSent = false;

    function peerKeys(): string[] {
        const key = peers.value[chatId]?.signPubKey;
        return key ? [key] : [];
    }

    const autoStopTyping = useDebounce(() => {
        wsSend({ type: "stop_typing", payload: { to: peerKeys() } });
        isTypingSent = false;
    }, 2000);

    function sendTyping(): void {
        if (!isTypingSent) {
            wsSend({ type: "typing", payload: { to: peerKeys() } });
            isTypingSent = true;
        }
        autoStopTyping.schedule();
    }

    function sendStopTyping(): void {
        if (!isTypingSent) return;
        autoStopTyping.cancel();
        wsSend({ type: "stop_typing", payload: { to: peerKeys() } });
        isTypingSent = false;
    }

    return {
        isPeerTyping,
        sendTyping,
        sendStopTyping,
    };
}
