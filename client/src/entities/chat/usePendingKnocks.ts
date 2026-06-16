import { ref } from "vue";

import { PendingKnockInfo } from "shared";

import { useWs } from "@shared/api/useWs";
import { STORES, useIndexedDb } from "@shared/lib/useIndexedDb";

export const pendingKnocks = ref<PendingKnockInfo[]>([]);

export function useKnocks() {
    const { write, remove, readAll } = useIndexedDb(STORES.PENDING_KNOCKS);
    const { subscribe } = useWs();

    async function loadKnocks(): Promise<void> {
        pendingKnocks.value = await readAll<PendingKnockInfo>();
    }

    async function removeKnock(chatId: string): Promise<void> {
        pendingKnocks.value = pendingKnocks.value.filter(
            (k) => k.chatId !== chatId
        );

        return remove(chatId);
    }

    async function saveKnock(
        knockInfo: PendingKnockInfo,
        chatId: string
    ): Promise<void> {
        pendingKnocks.value.push(knockInfo);
        return write(knockInfo, chatId);
    }

    function startSync(): void {
        loadKnocks();

        subscribe("chat_knock", async (msg) => {
            const { chatId, peerInfo, ip, region, timezone } = msg.payload;
            const alreadyKnocking = pendingKnocks.value.some(
                (k) => k.chatId === chatId
            );
            if (!alreadyKnocking) {
                const knock: PendingKnockInfo = {
                    chatId,
                    peerInfo,
                    ip,
                    region,
                    timezone,
                };
                await saveKnock(knock, chatId);
            }
        });
    }

    return {
        loadKnocks,
        removeKnock,
        saveKnock,
        startSync,
    };
}
