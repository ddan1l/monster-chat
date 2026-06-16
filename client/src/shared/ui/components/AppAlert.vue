<script setup lang="ts">
defineProps<{
    variant?: "primary" | "danger";
    display?: "flex" | "block";
}>();
</script>

<template>
    <div
        class="mc-alert"
        :class="[`mc-alert_${variant ?? 'primary'}`]"
        :style="{ display: display ?? 'block' }"
    >
        <slot />
    </div>
</template>

<style lang="scss" scoped>
.mc-alert {
    padding: 13px 15px;
    font-size: 0.825em;
    gap: 10px;
    font-weight: 600;
    color: var(--mc-acid);
    background-color: var(--mc-bg-rail);
    border: 1px solid var(--mc-acid);
}
</style>
