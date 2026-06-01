<script setup lang="ts">
defineProps<{
    variant?: "primary" | "ghost" | "danger";
    size?: "sm" | "md";
    disabled?: boolean;
}>();
</script>

<template>
    <button
        class="mc-btn"
        :class="[`mc-btn_${variant ?? 'primary'}`, `mc-btn_${size ?? 'md'}`]"
        :disabled="disabled"
    >
        <slot />
    </button>
</template>

<style lang="scss" scoped>
.mc-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-weight: 500;
    transition: 0.1s;
    white-space: nowrap;

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
            background: var(--mc-acid-dim);
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
        color: var(--mc-danger);

        &:hover {
            background: color-mix(in srgb, var(--mc-danger) 12%, transparent);
        }
    }
}
</style>
