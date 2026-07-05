<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: number;
        disabled?: boolean;
        active?: boolean;
        title?: string;
        tag?: string;
    }>(),
    {
        size: 30,
        disabled: false,
        active: false,
        tag: "button",
    }
);
</script>

<template>
    <component
        :is="tag"
        class="mc-btn-sm"
        :class="{ 'mc-btn-sm_disabled': disabled, 'mc-btn-sm_active': active }"
        :title="title"
        :style="{
            width: `${size}px`,
            height: `${size}px`,
            minWidth: `${size}px`,
        }"
        :disabled="tag === 'button' ? disabled : undefined"
    >
        <slot />
    </component>
</template>

<style lang="scss" scoped>
.mc-btn-sm {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 0.1s;
    color: var(--mc-fg-dim);

    &:hover:not(:disabled):not(&_disabled) {
        color: var(--mc-acid);
        background-color: var(--mc-bg-sel);
    }

    &_active {
        color: var(--mc-acid);
    }

    &_disabled {
        opacity: 0.4;
        pointer-events: none;
    }
}
</style>
