import { onUnmounted } from "vue";

import { useWs } from "./useWs";

import type { ServerMessage } from "shared";

// WS-подписки с авто-отпиской при размонтировании компонента.
//   on(type, handler) — обёртка над subscribe, чья отписка снимется сама.
//   track(cleanup)    — регистрирует прочий cleanup (напр. stop от watch,
//                       созданного вне setup-скоупа — такой сам не диспоузится).
// Убирает ручное ведение массива unsubs + onUnmounted, продублированное по
// многим композаблам/компонентам. Вызывать только в setup-контексте.
export function useWsChannel() {
    const { send, connected } = useWs();
    const cleanups: (() => void)[] = [];

    function on<T extends ServerMessage["type"]>(
        type: T,
        handler: (msg: Extract<ServerMessage, { type: T }>) => void
    ): () => void {
        const unsub = useWs().subscribe(type, handler);
        cleanups.push(unsub);
        return unsub;
    }

    function track(cleanup: () => void): void {
        cleanups.push(cleanup);
    }

    onUnmounted(() => {
        cleanups.forEach((fn) => fn());
    });

    return { send, connected, on, track };
}
