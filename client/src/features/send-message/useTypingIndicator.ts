import { ref } from "vue";

import { useWs } from "@shared/api/useWs";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useDebounce } from "@shared/lib/useDebounce";

export function useTypingIndicator(chatId: string) {
    const { send: wsSend } = useWs();
    const { exportSignPublicKey } = useCrypto();

    const isPeerTyping = ref(false);
    let isTypingSent = false;

    const autoStopTyping = useDebounce(async () => {
        const from = await exportSignPublicKey();
        wsSend({ type: "stop_typing", payload: { chatId, from } });
        isTypingSent = false;
    }, 2000);

    const clearPeerTyping = useDebounce(() => {
        isPeerTyping.value = false;
    }, 3000);

    async function sendTyping(): Promise<void> {
        const from = await exportSignPublicKey();
        if (!isTypingSent) {
            wsSend({ type: "typing", payload: { chatId, from } });
            isTypingSent = true;
        }
        autoStopTyping.schedule();
    }

    async function sendStopTyping(): Promise<void> {
        if (!isTypingSent) return;
        autoStopTyping.cancel();
        const from = await exportSignPublicKey();
        wsSend({ type: "stop_typing", payload: { chatId, from } });
        isTypingSent = false;
    }

    function onPeerTyping(): void {
        isPeerTyping.value = true;
        clearPeerTyping.schedule();
    }

    function onPeerStopTyping(): void {
        isPeerTyping.value = false;
        clearPeerTyping.cancel();
    }

    return {
        isPeerTyping,
        sendTyping,
        sendStopTyping,
        onPeerTyping,
        onPeerStopTyping,
    };
}
