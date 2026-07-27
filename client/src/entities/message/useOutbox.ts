import { watch } from "vue";

import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { useChatMessages } from "./useMessages";

import type { MessageBundle } from "shared";

interface OutboxEntry {
    nonce: string;
    chatId: string;
    bundle: MessageBundle; // v2-бандл с per-device копиями (до ACK)
}

export function useOutbox() {
    const { write, readAll, remove } = useIndexedDb(STORES.OUTBOX);
    const { send, subscribe, connected } = useWs();
    const { markSent } = useChatMessages();

    // Кладём исходящий бандл в outbox до получения ACK (по логическому nonce).
    async function enqueue(
        chatId: string,
        bundle: MessageBundle
    ): Promise<void> {
        await write({ nonce: bundle.nonce, chatId, bundle });
    }

    // Пересылаем все неподтверждённые бандлы (at-least-once).
    async function flush(): Promise<void> {
        const pending = await readAll<OutboxEntry>();
        for (const entry of pending) {
            send({ type: "message_bundle", payload: entry.bundle });
        }
    }

    function startSync(): void {
        subscribe("ack", async (msg) => {
            const { nonce, seq } = msg.payload;
            await remove(nonce);
            await markSent(nonce, seq);
        });

        watch(connected, (isConnected, was) => {
            if (isConnected && was === false) flush();
        });
    }

    return { enqueue, flush, startSync };
}
