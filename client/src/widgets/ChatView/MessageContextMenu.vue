<script setup lang="ts">
import { ref } from "vue";

import AppMenu from "@shared/ui/components/AppMenu.vue";
import AppMenuContent from "@shared/ui/components/AppMenuContent.vue";
import AppMenuDivider from "@shared/ui/components/AppMenuDivider.vue";
import AppMenuItem from "@shared/ui/components/AppMenuItem.vue";
import IconCopy from "@shared/ui/icons/IconCopy.vue";
import IconDelete from "@shared/ui/icons/IconDelete.vue";
import IconEdit from "@shared/ui/icons/IconEdit.vue";
import IconPin from "@shared/ui/icons/IconPin.vue";
import IconPlus from "@shared/ui/icons/IconPlus.vue";
import IconReply from "@shared/ui/icons/IconReply.vue";

const props = defineProps<{
    anchor: HTMLElement | null;
    isSelf: boolean;
    text: string;
    editingNonce: string | null;
    pinned: boolean;
    placement: "top-start" | "top-end";
}>();

const emit = defineEmits<{
    editStart: [];
    delete: [];
    togglePin: [];
    reply: [];
    reaction: [emoji: string];
    close: [];
}>();

const menu = ref<InstanceType<typeof AppMenu> | null>(null);

// Быстрые реакции в шапке меню (остаются сверху и в режиме пикера).
const quickReactions = ["👍", "❤️", "😂", "🔥", "👀"];

// Полный набор эмодзи для пикера (по «+»). Расширяемый список.
// prettier-ignore
const allEmojis = [
    "👍", "👎", "❤️", "🔥", "🎉", "👏",
    "🙏", "💯", "😀", "😃", "😄", "😁",
    "😆", "😅", "😂", "🤣", "😊", "🙂",
    "😉", "😍", "🥰", "😘", "😋", "😎",
    "🤔", "🤨", "😐", "😴", "😢", "😭",
    "😡", "🤯", "🥳", "😱", "😳", "🥺",
    "😬", "🙄", "🤤", "🤗", "👀", "🙌",
    "👌", "✌️", "🤞", "🤝", "💪", "🫶",
    "⭐", "✨", "🌟", "💥", "💦", "🎯",
];

// Открыт ли пикер всех эмодзи (вместо пунктов действий).
const pickerOpen = ref(false);

function open() {
    pickerOpen.value = false;
    menu.value?.open();
}

function openAt(e: MouseEvent) {
    pickerOpen.value = false;
    menu.value?.openAt(e);
}

function copyText() {
    navigator.clipboard.writeText(props.text);
    menu.value?.close();
}

defineExpose({ open, openAt });
</script>

<template>
    <AppMenu
        ref="menu"
        :anchor="anchor"
        :placement="placement"
        @close="emit('close')"
    >
        <template #default="{ close }">
            <div class="mc-msg-menu">
                <!-- Ряд быстрых реакций — сверху всегда. Последняя кнопка: «+»
                     (открыть пикер) или «назад» (вернуться из пикера). -->
                <div
                    class="mc-msg-menu__reactions"
                    :class="{ 'mc-msg-menu__reactions_bordered': pickerOpen }"
                >
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
                        v-if="!pickerOpen"
                        class="mc-msg-menu__reaction mc-msg-menu__reaction_more"
                        aria-label="Больше эмодзи"
                        @click="pickerOpen = true"
                    >
                        <IconPlus />
                    </button>
                    <button
                        v-else
                        class="mc-msg-menu__reaction mc-msg-menu__reaction_more"
                        aria-label="Назад"
                        @click="pickerOpen = false"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M15 6l-6 6 6 6" />
                        </svg>
                    </button>
                </div>

                <!-- Пикер всех эмодзи (по «+»). -->
                <div v-if="pickerOpen" class="mc-msg-menu__grid">
                    <button
                        v-for="emoji in allEmojis"
                        :key="emoji"
                        class="mc-msg-menu__reaction"
                        @click="
                            emit('reaction', emoji);
                            close();
                        "
                    >
                        {{ emoji }}
                    </button>
                </div>

                <!-- Обычные действия. -->
                <template v-else>
                    <AppMenuDivider />
                    <AppMenuContent>
                        <AppMenuItem
                            @click="
                                emit('reply');
                                close();
                            "
                        >
                            <IconReply /> Ответить
                        </AppMenuItem>
                        <AppMenuItem
                            v-if="isSelf"
                            :disabled="editingNonce !== null"
                            @click="
                                emit('editStart');
                                close();
                            "
                        >
                            <IconEdit /> Редактировать
                        </AppMenuItem>
                        <AppMenuItem @click="copyText">
                            <IconCopy /> Скопировать
                        </AppMenuItem>

                        <AppMenuItem
                            @click="
                                emit('togglePin');
                                close();
                            "
                        >
                            <IconPin /> {{ pinned ? "Открепить" : "Закрепить" }}
                        </AppMenuItem>
                    </AppMenuContent>
                    <AppMenuDivider />

                    <AppMenuContent>
                        <AppMenuItem
                            variant="danger"
                            @click="
                                emit('delete');
                                close();
                            "
                        >
                            <IconDelete /> Удалить
                        </AppMenuItem>
                    </AppMenuContent>
                </template>
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

        // В режиме пикера — разделитель под рядом быстрых реакций.
        &_bordered {
            border-bottom: 1px solid var(--mc-line);
        }
    }

    &__reaction {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        line-height: 1;
        font-family:
            "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji",
            sans-serif;
        font-variant-emoji: emoji;
        border-radius: 2px;
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

    // Сетка эмодзи: 6 колонок (как 6 кнопок в верхнем ряду) — ширина совпадает с меню.
    &__grid {
        display: grid;
        grid-template-columns: repeat(6, 32px);
        justify-content: center;
        gap: 2px;
        max-height: 220px;
        padding: 8px;
        overflow-y: auto;
    }
}
</style>
