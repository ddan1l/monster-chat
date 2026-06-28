<script setup lang="ts">
import { computed } from "vue";

import { avatarComponent } from "@entities/user/useAvatar";

const props = defineProps<{
    avatarKey: string;
    selectable?: boolean;
    selected?: boolean;
    size?: number;
}>();

defineEmits<{ select: [key: string] }>();

const component = computed(() => avatarComponent(props.avatarKey));

const tag = computed(() => (props.selectable ? "button" : "div"));
</script>

<template>
    <component
        :is="tag"
        class="mc-user-avatar"
        :class="{ 'mc-user-avatar_selected': selectable && selected }"
        :style="{
            width: `${size || 42}px`,
            height: `${size || 42}px`,
        }"
        @click="selectable && $emit('select', avatarKey)"
    >
        <component :is="component" class="mc-user-avatar__icon" />
    </component>
</template>

<style lang="scss" scoped>
.mc-user-avatar {
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
