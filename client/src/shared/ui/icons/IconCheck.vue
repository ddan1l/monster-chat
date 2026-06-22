<script setup lang="ts">
defineProps<{ double?: boolean }>();
</script>

<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
    >
        <path v-if="double" d="M3 12l4 4 8-8" />
        <path v-if="double" d="M10 13l4 3 8-8" />
        <path v-else d="M3 12l4 4 8-8" />
    </svg>
</template>
