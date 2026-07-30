<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    verified?: boolean;
    onClickVerified?: (() => void) | null;
}>();

const clickable = computed(() => typeof props.onClickVerified === "function");

function handleClick() {
    props.onClickVerified?.();
}
</script>

<template>
    <span
        class="verified-tag"
        :class="[
            `verified-tag_${verified ? 'verified' : 'unverified'}`,
            { 'verified-tag_clickable': clickable },
        ]"
        @click="handleClick"
    >
        {{ verified ? "✓ проверен" : " не проверен" }}
    </span>
</template>

<style lang="scss">
.verified-tag {
    font-family: var(--mc-mono);
    font-size: 0.48em;
    font-weight: 700;
    padding: 1px 6px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: normal;
    &_unverified {
        border: 1px solid var(--mc-danger);
        color: var(--mc-danger);
        // Кликабельный неверифицированный — hover красный.
        &.verified-tag_clickable:hover {
            background: var(--mc-danger);
            border-color: var(--mc-danger);
            color: var(--mc-bg-window);
        }
    }
    &_verified {
        border: 1px solid var(--mc-alert);
        color: var(--mc-alert);
        // Кликабельный верифицированный — hover acid.
        &.verified-tag_clickable:hover {
            background: var(--mc-acid);
            border-color: var(--mc-acid);
            color: var(--mc-bg-window);
        }
    }
    &_clickable {
        cursor: pointer;
        transition:
            background 0.1s,
            color 0.1s,
            border-color 0.1s;
    }
}
</style>
