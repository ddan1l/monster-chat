<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ timestamp: number }>();

const emit = defineEmits<{ open: [] }>();

const label = computed(() =>
    new Date(props.timestamp).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
);
</script>

<template>
    <div class="mc-date-divider">
        <button
            class="mc-date-divider__label"
            title="Перейти к дате"
            @click="emit('open')"
        >
            {{ label }}
        </button>
    </div>
</template>

<style scoped lang="scss">
.mc-date-divider {
    display: flex;
    justify-content: center;
    margin: 8px 0;
    pointer-events: none;

    &__label {
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        line-height: 130%;
        color: var(--mc-fg-mute);
        text-transform: uppercase;
        background: var(--mc-bg-window);
        border: 1px solid var(--mc-line-hard);
        // Плашка кликабельна (переход к дате), контейнер — нет.
        pointer-events: auto;
        cursor: pointer;

        &:hover {
            color: var(--mc-fg);
            border-color: var(--mc-acid);
        }
    }
}
</style>
