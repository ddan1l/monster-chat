<script setup lang="ts">
import { computed } from "vue";

import { useDate } from "@shared/lib/useDate";
import IconCheck from "@shared/ui/icons/IconCheck.vue";

import { useChatPreview } from "@entities/chat/useChatPreview";
import { peers, onlineStatus } from "@entities/peer/usePeers";
import UserCard from "@entities/user/ui/UserCard.vue";

import type { Chat } from "shared";

const props = defineProps<{
    chat: Chat;
    isActive: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

const { formatMessageTime } = useDate();

const peer = computed(() => peers.value[props.chat.id]);
const isOnline = computed(() => onlineStatus.value[props.chat.id] ?? false);

const { displayText, unreadCount, lastMessage, isOwn, isRead } = useChatPreview(
    props.chat.id,
    computed(() => props.isActive)
);
</script>

<template>
    <div
        class="mc-chat-item"
        :class="{ 'mc-chat-item_active': isActive }"
        @click="emit('select')"
    >
        <UserCard :peer="peer" :online="isOnline" variant="normal">
            <template v-if="lastMessage" #time>
                {{ formatMessageTime(lastMessage.timestamp) }}
            </template>
            <template #text>
                <span v-if="displayText">{{ displayText }}</span>

                <IconCheck
                    v-if="isOwn"
                    class="mc-chat-item-status"
                    :double="isRead"
                />
                <span v-else-if="unreadCount" class="mc-chat-item-badge">{{
                    unreadCount
                }}</span>
            </template>
        </UserCard>
    </div>
</template>

<style lang="scss" scoped>
@keyframes indicator-enter {
    from {
        top: 50%;
        bottom: 50%;
        opacity: 0;
    }
    to {
        top: 0;
        bottom: 0;
        opacity: 1;
    }
}

.mc-chat-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;

    &::before {
        content: "";
        position: absolute;
        left: -1px;
        width: 2px;
        top: 50%;
        bottom: 50%;
        background: var(--mc-acid);
        box-shadow: 0 0 6px var(--mc-acid);
        opacity: 0;
    }

    &:hover {
        background-color: var(--mc-bg-card);
    }

    &_active {
        background-color: var(--mc-bg-sel);

        &::before {
            animation: indicator-enter 0.22s ease forwards;
        }

        &:hover {
            background-color: var(--mc-bg-sel);
        }
    }

    .mc-chat-item-status {
        color: var(--mc-acid);
        flex-shrink: 0;
    }

    .mc-chat-item-badge {
        width: 16px;
        height: 14px;
        min-width: 16px;
        display: inline-flex;
        margin-left: auto;
        background-color: var(--mc-acid);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--mc-fg-faint);
        line-height: 1;
        font-size: 0.9em;
    }
}
</style>
