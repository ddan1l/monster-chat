<script setup lang="ts">
// Кнопка «вниз» (к последним сообщениям) с бейджем числа непрочитанных и подсказкой.
defineProps<{ count: number }>();
defineEmits<{ click: [] }>();
</script>

<template>
    <button class="mc-to-latest" @click="$emit('click')">
        <svg
            class="mc-to-latest__arrow"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M12 5v13M7 13l5 5 5-5" />
        </svg>
        <span v-if="count > 0" class="mc-to-latest__badge">{{ count }}</span>
        <span class="mc-to-latest__tip">Вниз</span>
    </button>
</template>

<style scoped lang="scss">
.mc-to-latest {
    position: absolute;
    right: 16px;
    bottom: 16px;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    color: var(--mc-acid);
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    transition: border-color 0.1s;

    &:hover {
        border-color: var(--mc-acid);
    }

    &__arrow {
        flex-shrink: 0;
    }

    // Бейдж числа непрочитанных — acid-квадрат в верхнем-правом углу.
    &__badge {
        position: absolute;
        top: -7px;
        right: -7px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--mc-mono);
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        color: var(--mc-bg-window);
        background: var(--mc-acid);
    }

    // Подсказка под кнопкой — появляется на наведении.
    &__tip {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        font-family: var(--mc-mono);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
        color: var(--mc-fg-mute);
        background: var(--mc-bg-window);
        border: 1px solid var(--mc-line-hard);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.12s;
    }

    &:hover .mc-to-latest__tip {
        opacity: 1;
    }
}
</style>
