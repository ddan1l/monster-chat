<script setup lang="ts">
import IconMic from "@shared/ui/icons/IconMic.vue";

defineProps<{ disabled?: boolean }>();
</script>

<template>
    <button class="button-sm audio-recording-btn" :disabled="disabled">
        <IconMic />
    </button>
</template>

<style scoped lang="scss">
.audio-recording-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    cursor: pointer;
}
</style>
