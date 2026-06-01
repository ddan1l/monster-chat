<script setup lang="ts">
import type { Component } from "vue";
import { computed } from "vue";

const props = defineProps<{
    avatarKey: string;
    selectable?: boolean;
    selected?: boolean;
}>();

defineEmits<{ select: [key: string] }>();

const modules = import.meta.glob("/src/shared/ui/icons/avatars/*.svg", {
    eager: true,
    query: "?component",
    import: "default",
});

const component = computed(
    () => modules[props.avatarKey] as Component | undefined
);

const tag = computed(() => (props.selectable ? "button" : "div"));
</script>

<template>
    <component
        :is="tag"
        class="mc-user-avatar"
        :class="{ 'mc-user-avatar_selected': selectable && selected }"
        @click="selectable && $emit('select', avatarKey)"
    >
        <component :is="component" class="mc-user-avatar__icon" />
    </component>
</template>

<style lang="scss" scoped>
.mc-user-avatar {
    width: 42px;
    height: 42px;
    padding: 2px;
    flex-shrink: 0;
    color: #050706;
    background: var(--mc-acid);

    &[type="button"]:hover {
        background: var(--mc-acid-dim);
    }

    &_selected {
        outline: 2px solid var(--mc-danger);
        outline-offset: -2px;
    }

    &__icon {
        width: 100%;
        height: 100%;
    }
}
</style>
