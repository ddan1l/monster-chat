<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { DecryptedMessage } from "@entities/message/useMessages";

const props = defineProps<{ pinned: DecryptedMessage[] }>();

const emit = defineEmits<{
    jump: [msg: DecryptedMessage];
    unpin: [nonce: string];
}>();

// pos: 0 — самое свежее закреплённое, дальше к старым (циклом по клику).
const pos = ref(0);
watch(
    () => props.pinned.length,
    (n) => {
        if (pos.value >= n) {
            pos.value = 0;
        }
    }
);

const current = computed(
    () => props.pinned[props.pinned.length - 1 - pos.value] ?? null
);

const preview = computed(() => {
    const m = current.value;
    if (!m) {
        return "";
    }
    const plain = (m.text ?? "").replace(/<[^>]*>/g, "").trim();
    if (plain) {
        return plain;
    }
    if (m.files?.length) {
        return "📎 Вложение";
    }
    return "Сообщение";
});

// Клик — прыгаем к показанному и прокручиваем к следующему (более старому).
function onOpen() {
    const m = current.value;
    if (!m) {
        return;
    }
    emit("jump", m);
    if (props.pinned.length > 1) {
        pos.value = (pos.value + 1) % props.pinned.length;
    }
}

function onUnpin() {
    if (current.value) {
        emit("unpin", current.value.nonce);
    }
}
</script>

<template>
    <div class="mc-pinned">
        <button class="mc-pinned__open" @click="onOpen">
            <span class="mc-pinned__bar" />
            <span class="mc-pinned__body">
                <span class="mc-pinned__title">
                    Закреплённое{{
                        pinned.length > 1 ? ` · ${pinned.length}` : ""
                    }}
                </span>
                <span class="mc-pinned__preview">{{ preview }}</span>
            </span>
        </button>
        <button class="mc-pinned__unpin" title="Открепить" @click="onUnpin">
            ✕
        </button>
    </div>
</template>

<style scoped lang="scss">
.mc-pinned {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--mc-bg-window);
    border-bottom: 1px solid var(--mc-line-hard);

    &__open {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
    }

    &__bar {
        flex-shrink: 0;
        width: 2px;
        align-self: stretch;
        min-height: 26px;
        background: var(--mc-acid);
        border-radius: 1px;
    }

    &__body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        line-height: 1.25;
    }

    &__title {
        font-size: 11px;
        font-weight: 700;
        color: var(--mc-acid);
    }

    &__preview {
        overflow: hidden;
        font-size: 13px;
        color: var(--mc-fg);
        white-space: nowrap;
        text-overflow: ellipsis;
    }

    &__unpin {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: var(--mc-fg-mute);
        background: none;
        border: none;
        border-radius: 6px;
        cursor: pointer;

        &:hover {
            color: var(--mc-fg);
            background: var(--mc-bg-sel);
        }
    }
}
</style>
