<script setup lang="ts">
import UserAvatar from "./UserAvatar.vue";
import UserVerifiedTag from "./UserVerifiedTag.vue";

import type { PeerInfo } from "shared";

withDefaults(
    defineProps<{
        peer?: PeerInfo;
        online?: boolean;
        variant: "large" | "normal" | "small";
        verified?: boolean | null;
        showAvatar?: boolean;
    }>(),
    { verified: null, peer: undefined, showAvatar: true }
);

const useAvatarSize = {
    large: 56,
    normal: 42,
    small: 36,
};
</script>

<template>
    <div class="mc-user-card">
        <div v-if="showAvatar" class="mc-user-card__avatar">
            <UserAvatar
                :size="useAvatarSize[variant]"
                :avatar-key="peer?.avatar ?? ''"
            />
            <span v-if="online" class="mc-user-card__status" />
        </div>
        <div class="mc-user-card-info" :class="`mc-user-card-info_${variant}`">
            <p class="mc-user-card-info-title">
                {{ peer?.name ?? "Безымянный" }}
                <UserVerifiedTag
                    v-if="verified !== null"
                    :verified="verified"
                />
                <span v-if="$slots.time" class="mc-user-card-time">
                    <slot name="time" />
                </span>
            </p>
            <p class="mc-user-card-info-descr">
                <slot name="text" />
            </p>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-user-card {
    display: flex;
    align-items: center;
    gap: 14px;
    flex: 1;
    max-width: 100%;

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
    }

    .mc-user-card-time {
        margin-left: auto;
        display: inline-block;
        color: var(--mc-fg-dim);
        font-size: 0.6em;
        font-family: var(--mc-mono);
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
            margin-top: 2px;
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            :deep(span:first-child) {
                flex: 1;
                overflow: hidden;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                user-select: none;
            }
        }
        &_large {
            .mc-user-card-info-title {
                font-size: 1.2em;
            }
        }
        &_small {
            .mc-user-card-info-title {
                font-size: 1em;
            }
            .mc-user-card-info-descr {
                margin-top: 0;
            }
        }
    }
}
</style>
