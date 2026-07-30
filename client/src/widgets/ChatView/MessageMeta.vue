<script setup lang="ts">
import { format } from "date-fns";

import IconCheck from "@shared/ui/icons/IconCheck.vue";
import IconClock from "@shared/ui/icons/IconClock.vue";
import IconPin from "@shared/ui/icons/IconPin.vue";

import type { DecryptedMessage } from "@features/chat-session/model/useChatSession";

defineProps<{ msg: DecryptedMessage; isSelf: boolean }>();
</script>

<template>
    <span class="mc-meta">
        <IconPin v-if="msg.pinned" class="mc-meta__pin" />
        <span v-if="msg.editedAt" class="mc-meta__edited">изм.</span>
        <span class="mc-meta__time">{{ format(msg.timestamp, "HH:mm") }}</span>
        <IconClock
            v-if="isSelf && msg.status === 'pending'"
            class="mc-meta__pending"
        />
        <IconCheck v-else-if="isSelf" :double="msg.isRead" />
    </span>
</template>

<style scoped lang="scss">
.mc-meta {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    opacity: 0.7;
    white-space: nowrap;

    &__pin {
        width: 11px;
        height: 11px;
    }
}
</style>
