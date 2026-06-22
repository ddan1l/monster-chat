<script setup lang="ts">
import IconPlus from "@shared/ui/icons/IconPlus.vue";

const emit = defineEmits<{ newChat: [] }>();
</script>

<template>
    <div class="mc-chat-list-header">
        <h2>ЧАТЫ<span class="color-accent">/</span></h2>

        <button class="button-sm" @click="emit('newChat')">
            <IconPlus />
        </button>
    </div>
</template>

<style lang="scss" scoped>
.mc-chat-list-header {
    padding: 20px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
