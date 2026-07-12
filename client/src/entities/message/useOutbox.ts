import { watch } from "vue";

import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { useChatMessages } from "./useMessages";

import type { ChatMessage } from "shared";

interface OutboxEntry {
    nonce: string;
    chatId: string;
    envelope: ChatMessage; // подписанный конверт (без расшифрованных полей)
}

export function useOutbox() {
    const { write, readAll, remove } = useIndexedDb(STORES.OUTBOX);
    const { send, subscribe, connected } = useWs();
    const { markSent } = useChatMessages();

    // Кладём исходящее сообщение в outbox до получения ACK.
    async function enqueue(
        chatId: string,
        envelope: ChatMessage
    ): Promise<void> {
        await write({ nonce: envelope.nonce, chatId, envelope });
    }

    // Пересылаем все неподтверждённые сообщения (at-least-once).
    async function flush(): Promise<void> {
        const pending = await readAll<OutboxEntry>();
        for (const entry of pending) {
            send({ type: "message", payload: entry.envelope });
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
