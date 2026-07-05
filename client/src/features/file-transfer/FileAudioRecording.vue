<script setup lang="ts">
import AppButtonSmall from "@shared/ui/components/AppButtonSmall.vue";
import IconMic from "@shared/ui/icons/IconMic.vue";

defineProps<{ disabled?: boolean }>();
</script>

<template>
    <AppButtonSmall :size="34" :disabled="disabled">
        <IconMic />
    </AppButtonSmall>
</template>
