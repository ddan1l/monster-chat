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
    gap: 8px;
    font-weight: 600;
    color: var(--mc-bg-rail);
    background-color: var(--mc-acid);
}
</style>
