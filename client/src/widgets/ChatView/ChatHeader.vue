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
}>();

const { formatLastSeen } = useDate();

const statusText = computed(() => {
    if (props.isOnline) {
        return "онлайн";
    }
    if (props.lastSeen) {
        return formatLastSeen(props.lastSeen);
    }
    return "офлайн";
});

const emit = defineEmits<{
    openSafety: [];
    deleteChat: [];
    deleteChatForAll: [];
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
                :on-click-verified="() => emit('openSafety')"
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
                        Удалить у себя
                    </button>
                    <button
                        class="chat-header__menu-item chat-header__menu-item_danger"
                        @click="
                            emit('deleteChatForAll');
                            showDeleteMenu = false;
                        "
                    >
                        Удалить у всех
                    </button>
                </div>
            </div>
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
    }

    &__menu {
        position: relative;
    }

    &__menu-btn {
        background: none;
        border: none;
        cursor: pointer;
        width: 34px;
        height: 34px;
        color: var(--mc-fg-mute);
        font-size: 16px;
        transition:
            background 0.1s,
            color 0.1s;

        &:hover {
            background: var(--mc-bg-sel);
            color: var(--mc-acid);
        }
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
}
</style>
