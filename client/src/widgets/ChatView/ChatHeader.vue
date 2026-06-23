<script setup lang="ts">
import { ref, computed } from "vue";

import { useDate } from "@shared/lib/useDate";

import UserCard from "@entities/user/ui/UserCard.vue";

import type { PeerInfo } from "shared";

const props = defineProps<{
    peer: PeerInfo;
    isOnline: boolean;
    lastSeen: number | null;
    verified: boolean | null;
    keyChanged: boolean;
}>();

const { formatLastSeen } = useDate();

const statusText = computed(() => {
    if (props.isOnline) return "онлайн";
    if (props.lastSeen) return formatLastSeen(props.lastSeen);
    return "офлайн";
});

const emit = defineEmits<{
    openPanel: [];
    deleteChat: [];
}>();

const showDeleteMenu = ref(false);
</script>

<template>
    <div class="chat-header">
        <!-- Header row -->
        <div class="chat-header__row">
            <UserCard
                :peer="peer"
                :online="isOnline"
                :show-avatar="false"
                :verified="verified"
                variant="small"
            >
                <template #text>{{ statusText }}</template>
            </UserCard>

            <!-- Delete chat -->
            <div class="chat-header__menu">
                <button
                    class="chat-header__menu-btn"
                    @click="showDeleteMenu = !showDeleteMenu"
                >
                    ⋮
                </button>
                <div v-if="showDeleteMenu" class="chat-header__menu-list">
                    <button
                        class="chat-header__menu-item chat-header__menu-item_danger"
                        @click="
                            emit('deleteChat');
                            showDeleteMenu = false;
                        "
                    >
                        Удалить чат
                    </button>
                </div>
            </div>

            <!-- Shield button -->
            <button
                class="chat-header__shield"
                :title="
                    verified
                        ? 'Verified — нажмите чтобы посмотреть Safety Numbers'
                        : 'Верифицировать'
                "
                @click="emit('openPanel')"
            >
                <svg
                    class="chat-header__shield-icon"
                    :class="{ 'chat-header__shield-icon_verified': verified }"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline v-if="verified" points="9 12 11 14 15 10" />
                </svg>
            </button>
        </div>

        <!-- Key rotation warning -->
        <div v-if="keyChanged" class="chat-header__warning">
            <svg
                class="chat-header__warning-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
                Ключи собеседника изменились. Сравните Safety Numbers голосом
                или лично и нажмите
                <button
                    class="chat-header__warning-link"
                    @click="emit('openPanel')"
                >
                    Верифицировать</button
                >.
            </span>
        </div>
    </div>
</template>

<style scoped lang="scss">
.chat-header {
    &__row {
        height: 60px;
        padding: 0 22px;
        border-bottom: 1px solid var(--mc-line);
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--mc-bg-rail);
    }

    &__menu {
        position: relative;
    }

    &__menu-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #555;
        font-size: 16px;
    }

    &__menu-list {
        position: absolute;
        right: 0;
        top: 100%;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 4px;
        z-index: 10;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 160px;
    }

    &__menu-item {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        padding: 6px 10px;
        text-align: left;
        font-size: 13px;
        border-radius: 4px;

        &_danger {
            color: #f87171;
        }
    }

    &__shield {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
    }

    &__shield-icon {
        stroke: #555;

        &_verified {
            stroke: #22c55e;
        }
    }

    &__warning {
        background: #2d1a00;
        border: 1px solid #92400e;
        border-radius: 8px;
        padding: 10px 14px;
        margin-bottom: 10px;
        font-size: 13px;
        color: #fbbf24;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    &__warning-icon {
        flex-shrink: 0;
    }

    &__warning-link {
        background: none;
        border: none;
        color: #fbbf24;
        text-decoration: underline;
        cursor: pointer;
        padding: 0;
        font-size: 13px;
    }
}
</style>
