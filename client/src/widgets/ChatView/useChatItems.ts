import { computed } from "vue";

import type { DecryptedMessage } from "@features/chat-session/model/useChatSession";

// Элемент списка чата: сообщение либо «печатает…». Дату дня показывает
// единственная плавающая плашка (см. ChatMessages) — строчных дивайдеров нет,
// чтобы не дублировать её и не рассинхронить центр под virtua.
export type ChatItem =
    | { type: "message"; msg: DecryptedMessage; index: number }
    | { type: "typing" };

export function useChatItems(
    messages: () => DecryptedMessage[],
    isTyping: () => boolean
) {
    const items = computed<ChatItem[]>(() => {
        const list: ChatItem[] = messages().map((msg, index) => ({
            type: "message",
            msg,
            index,
        }));
        // «Печатает…» — обычный элемент в конце потока (а не absolute-оверлей),
        // чтобы он шёл ПОД последним сообщением, а не накрывал его.
        if (isTyping()) {
            list.push({ type: "typing" });
        }
        return list;
    });

    return { items };
}
