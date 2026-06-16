<script setup lang="ts">
defineProps<{
    variant?: "primary" | "ghost" | "danger";
    size?: "sm" | "md";
    disabled?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
</script>

<template>
    <button
        class="mc-btn"
        :class="[`mc-btn_${variant ?? 'primary'}`, `mc-btn_${size ?? 'md'}`]"
        :disabled="disabled"
        @click="emit('click')"
    >
        <slot />
    </button>
</template>

<style lang="scss" scoped>
.mc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 6px;
    font-weight: 700;
    min-height: 46px;
    transition: 0.1s;
    white-space: nowrap;
    text-transform: uppercase;

    &:disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    &_md {
        height: 32px;
        padding: 0 14px;
        font-size: 13px;
    }

    &_sm {
        height: 26px;
        padding: 0 10px;
        font-size: 12px;
    }

    &_primary {
        background: var(--mc-acid);
        color: #000;

        &:hover {
            box-shadow: 0 0 34px var(--mc-acid-glow);
        }
    }

    &_ghost {
        color: var(--mc-fg-mute);

        &:hover {
            color: var(--mc-fg);
            background: var(--mc-bg-sel);
        }
    }

    &_danger {
        color: var(--mc-fg-mute);
        border: 1px solid var(--mc-line-hard);

        &:hover {
            color: var(--mc-danger);
            border-color: var(--mc-danger);
        }
    }
}
</style>
