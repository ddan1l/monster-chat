<script setup lang="ts">
defineProps<{
    variant?: "primary" | "danger";
}>();
</script>

<template>
    <div class="mc-alert" :class="[`mc-alert_${variant ?? 'primary'}`]">
        <slot />
    </div>
</template>

<style lang="scss" scoped>
.mc-alert {
    padding: 10px 12px;
    font-size: 0.825em;
    font-weight: 600;
    color: var(--mc-bg-rail);
    background-color: var(--mc-fg);
}
</style>
