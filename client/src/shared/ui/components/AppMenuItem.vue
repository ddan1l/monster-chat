<script setup lang="ts">
defineProps<{
    variant?: "default" | "danger";
    disabled?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
</script>

<template>
    <button
        class="mc-menu-item"
        :class="`mc-menu-item_${variant ?? 'default'}`"
        :disabled="disabled"
        role="menuitem"
        @click="emit('click')"
    >
        <slot />
    </button>
</template>

<style lang="scss" scoped>
.mc-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 9px 9px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-align: left;
    line-height: 120%;
    color: var(--mc-fg);
    font-family: var(--mc-mono);
    transition: 0.1s;
    text-transform: uppercase;

    :deep(svg) {
        color: var(--mc-fg-mute);
    }

    &:hover {
        color: var(--mc-acid);
        background: var(--mc-bg-sel);
    }

    &:disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    &_danger {
        color: var(--mc-danger);
        :deep(svg) {
            color: var(--mc-danger);
        }
        &:hover {
            color: var(--mc-danger);
            background: var(--mc-danger-hover);
        }
    }
}
</style>
