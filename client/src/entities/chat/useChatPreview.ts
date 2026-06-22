import { computed, type Ref } from "vue";

import { unreadChatNotifications } from "@entities/chat/useChatNotification";
import { lastMessageByChat } from "@entities/message/useMessages";
import { typingStatus } from "@entities/peer/usePeers";

export function useChatPreview(chatId: string, isActive: Ref<boolean>) {
    const unreadCount = computed(
        () => unreadChatNotifications.value[chatId] ?? 0
    );
    const lastMessage = computed(() => lastMessageByChat.value[chatId]);
    const isTyping = computed(() => typingStatus.value[chatId] ?? false);

    const displayText = computed(() => {
        if (isTyping.value && !isActive.value) return "печатает…";

        if (unreadCount.value) {
            if (unreadCount.value > 1) {
                return "Новые сообщения";
            }
            return "Новое сообщение";
        }

        const message = lastMessage.value as
            | { action?: string; files?: { name: string }[]; text?: string }
            | undefined;
        if (!message) {
            return "Чат создан";
        }
        if (message.action) {
            return "";
        }
        if (message.files?.length) {
            return `📎 ${message.files[0].name}`;
        }

        return message.text ?? "";
    });

    const isOwn = computed(() => lastMessage.value?.isOwn ?? false);
    const isRead = computed(() => lastMessage.value?.isRead ?? false);

    return { displayText, unreadCount, lastMessage, isOwn, isRead };
}
