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
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    text-align: left;
    color: var(--mc-fg-mute);
    transition: 0.1s;

    &:hover {
        color: var(--mc-fg);
        background: var(--mc-bg-sel);
    }

    &:disabled {
        opacity: 0.4;
        pointer-events: none;
    }

    &_danger:hover {
        color: var(--mc-danger);
    }
}
</style>
