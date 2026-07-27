<script setup lang="ts">
import { ref } from "vue";

import AppMenu from "@shared/ui/components/AppMenu.vue";
import AppMenuItem from "@shared/ui/components/AppMenuItem.vue";

const props = defineProps<{
    anchor: HTMLElement | null;
    isSelf: boolean;
    text: string;
    editingNonce: string | null;
    placement: "top-start" | "top-end";
}>();

const emit = defineEmits<{
    editStart: [];
    deleteForMe: [];
    deleteForAll: [];
    reaction: [emoji: string];
}>();

const menu = ref<InstanceType<typeof AppMenu> | null>(null);

const quickReactions = ["👍", "❤️", "😂", "🔥", "👀"];

function open() {
    menu.value?.open();
}

function openAt(e: MouseEvent) {
    menu.value?.openAt(e);
}

function copyText() {
    navigator.clipboard.writeText(props.text);
    menu.value?.close();
}

defineExpose({ open, openAt });
</script>

<template>
    <AppMenu ref="menu" :anchor="anchor" :placement="placement">
        <template #default="{ close }">
            <div class="mc-msg-menu">
                <div class="mc-msg-menu__reactions">
                    <button
                        v-for="emoji in quickReactions"
                        :key="emoji"
                        class="mc-msg-menu__reaction"
                        @click="
                            emit('reaction', emoji);
                            close();
                        "
                    >
                        {{ emoji }}
                    </button>
                    <button
                        class="mc-msg-menu__reaction mc-msg-menu__reaction_more"
                        @click="close"
                    >
                        +
                    </button>
                </div>
                <div class="mc-msg-menu__divider" />
                <AppMenuItem @click="close"> ↩ Ответить </AppMenuItem>
                <AppMenuItem
                    v-if="isSelf"
                    :disabled="editingNonce !== null"
                    @click="
                        emit('editStart');
                        close();
                    "
                >
                    ✏️ Редактировать
                </AppMenuItem>
                <AppMenuItem @click="copyText"> 📋 Скопировать </AppMenuItem>
                <AppMenuItem @click="close"> ↗ Переслать </AppMenuItem>
                <AppMenuItem @click="close"> 📌 Закрепить </AppMenuItem>
                <div class="mc-msg-menu__divider" />
                <AppMenuItem
                    variant="danger"
                    @click="
                        emit('deleteForMe');
                        close();
                    "
                >
                    🗑️ Удалить у меня
                </AppMenuItem>
                <AppMenuItem
                    v-if="isSelf"
                    variant="danger"
                    @click="
                        emit('deleteForAll');
                        close();
                    "
                >
                    🗑️ Удалить у всех
                </AppMenuItem>
            </div>
        </template>
    </AppMenu>
</template>

<style lang="scss" scoped>
.mc-msg-menu {
    display: flex;
    flex-direction: column;
    min-width: 200px;

    &__reactions {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 6px 8px;
    }

    &__reaction {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border-radius: 8px;
        transition: background 0.1s;

        &:hover {
            background: var(--mc-bg-sel);
        }

        &_more {
            font-size: 16px;
            color: var(--mc-fg-mute);
            font-weight: 600;
        }
    }

    &__divider {
        height: 1px;
        background: var(--mc-line-hard);
        margin: 2px 8px;
    }
}
</style>
