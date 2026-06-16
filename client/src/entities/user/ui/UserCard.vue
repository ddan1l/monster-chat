<script setup lang="ts">
import type { PeerInfo } from "shared";
import UserAvatar from "./UserAvatar.vue";
import UserVerifiedTag from "./UserVerifiedTag.vue";

defineProps<{
    peer: PeerInfo;
    online?: boolean;
    variant: "large" | "normal" | "small";
    verified?: boolean;
}>();

const useAvatarSize = {
    large: 56,
    normal: 42,
    small: 32,
};
</script>

<template>
    <div class="mc-user-card">
        <div class="mc-user-card__avatar">
            <UserAvatar
                :size="useAvatarSize[variant]"
                :avatar-key="peer.avatar ?? ''"
            />
            <span v-if="online" class="mc-user-card__status" />
        </div>
        <div class="mc-user-card-info" :class="`mc-user-card-info_${variant}`">
            <p class="mc-user-card-info-title">
                {{ peer.name }}
                <UserVerifiedTag :verified="verified" />
            </p>
            <p class="mc-user-card-info-descr">
                <slot />
            </p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-user-card {
    display: flex;
    align-items: center;
    gap: 14px;

    &__avatar {
        position: relative;
        flex-shrink: 0;
    }

    &__status {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--mc-acid);
        box-shadow:
            0 0 0 2px var(--mc-bg-list),
            0 0 6px var(--mc-acid);

        &_online {
            background: var(--mc-acid);
        }
    }

    .mc-user-card-info {
        display: flex;
        flex: 1;
        flex-direction: column;
        overflow: hidden;
        .mc-user-card-info-title {
            font-weight: 700;
            color: var(--mc-fg);
            font-size: 1em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .mc-user-card-info-descr {
            font-weight: 600;
            font-family: var(--mc-mono);
            color: var(--mc-fg-mute);
            font-size: 0.7em;
            overflow: hidden;
            white-space: nowrap;
            overflow: hidden;
            flex: 1;
            text-overflow: ellipsis;
        }

        &_large {
            .mc-user-card-info-title {
                font-size: 1.2em;
            }
        }
    }
}
</style>
