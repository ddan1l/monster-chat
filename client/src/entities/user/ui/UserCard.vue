<script setup lang="ts">
import type { PeerInfo } from "shared";
import UserAvatar from "./UserAvatar.vue";

defineProps<{
    peer: PeerInfo;
    online?: boolean;
}>();
</script>

<template>
    <div class="mc-user-card">
        <div class="mc-user-card__avatar">
            <UserAvatar :avatar-key="peer.avatar ?? ''" />
            <span
                v-if="online !== undefined"
                class="mc-user-card__status"
                :class="{ 'mc-user-card__status_online': online }"
            />
        </div>
        <div class="mc-user-card__info">
            <span class="mc-user-card__name">{{ peer.name }}</span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-user-card {
    display: flex;
    align-items: center;
    gap: 10px;

    &__avatar {
        position: relative;
        flex-shrink: 0;
    }

    &__status {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid var(--mc-bg-list);
        background: var(--mc-fg-dim);

        &_online {
            background: #22c55e;
        }
    }

    &__name {
        font-size: 13px;
        font-weight: 600;
        color: var(--mc-fg);
    }
}
</style>
