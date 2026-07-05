<script setup lang="ts">
import AppButtonSmall from "@shared/ui/components/AppButtonSmall.vue";
import IconPlus from "@shared/ui/icons/IconPlus.vue";

const emit = defineEmits<{ newChat: [] }>();
</script>

<template>
    <div class="mc-chat-list-header">
        <div class="mc-chat-list-header__wrapper">
            <h2>ЧАТЫ<span class="color-accent">/</span></h2>

            <AppButtonSmall @click="emit('newChat')">
                <IconPlus />
            </AppButtonSmall>
        </div>

        <slot name="search" />
    </div>
</template>

<style lang="scss" scoped>
.mc-chat-list-header {
    padding: 20px 16px;
    padding-bottom: 0;

    &__wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    &__actions {
        display: flex;
        gap: 2px;
    }
}
</style>
