import { computed } from "vue";

import type { DecryptedMessage } from "@features/send-message/useChatSession";

export type ChatItem =
    | { type: "divider"; ts: number; key: string }
    | { type: "message"; msg: DecryptedMessage; index: number };

function dayKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useChatItems(messages: () => DecryptedMessage[]) {
    const items = computed<ChatItem[]>(() => {
        const result: ChatItem[] = [];
        let lastDay = "";
        messages().forEach((msg, index) => {
            const day = dayKey(msg.timestamp);
            if (day !== lastDay) {
                lastDay = day;
                result.push({ type: "divider", ts: msg.timestamp, key: day });
            }
            result.push({ type: "message", msg, index });
        });
        return result;
    });

    return { items };
}
