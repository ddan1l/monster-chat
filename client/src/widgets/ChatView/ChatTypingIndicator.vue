<script setup lang="ts">
import UserAvatar from "@entities/user/ui/UserAvatar.vue";

import type { PeerInfo } from "shared";

defineProps<{ peer: PeerInfo | null }>();
</script>

<template>
    <div class="mc-message-wrapper">
        <UserAvatar
            v-if="peer?.avatar"
            :avatar-key="peer.avatar"
            :size="30"
            class="mc-message-wrapper__avatar"
        />
        <div class="mc-message">
            <span class="mc-typing__dot" />
            <span class="mc-typing__dot" />
            <span class="mc-typing__dot" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-message-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 2px 22px 8px;

    &__avatar {
        flex-shrink: 0;
        margin-bottom: 1px;
    }
}

.mc-message {
    background: var(--mc-bg-bubble-in);
    border: 1px solid var(--mc-line);
    border-left: 2px solid var(--mc-line-hard);
    padding: 11px 13px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.mc-typing__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--mc-fg-mute);
    animation:
        mc-typing-blink 1.2s infinite ease-in-out,
        mc-typing-bounce 1.2s infinite ease-in-out;

    &:nth-child(2) {
        animation-delay: 0.2s;
    }
    &:nth-child(3) {
        animation-delay: 0.4s;
    }
}

@keyframes mc-typing-bounce {
    0%,
    60%,
    100% {
        transform: translateY(0);
    }
    30% {
        transform: translateY(-5px);
    }
}

@keyframes mc-typing-blink {
    0%,
    60%,
    100% {
        opacity: 0.25;
        background: var(--mc-fg-mute);
    }
    30% {
        opacity: 1;
        background: var(--mc-acid);
    }
}
</style>
