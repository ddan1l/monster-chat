<script setup lang="ts">
defineProps<{
    verified?: boolean;
}>();
</script>

<template>
    <span
        class="verified-tag"
        :class="`verified-tag_${verified ? 'verified' : 'unverified'}`"
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
    }
    &_verified {
        border: 1px solid var(--mc-acid);
        color: var(--mc-acid);
    }
}
</style>
