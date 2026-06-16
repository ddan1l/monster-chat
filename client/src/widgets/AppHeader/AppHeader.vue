<script setup lang="ts">
import { ref } from "vue";
import AppModal from "@shared/ui/components/AppModal.vue";

declare const __APP_VERSION__: string;
const name = import.meta.env.VITE_APP_NAME as string;
const version = __APP_VERSION__;

const open = ref(false);
</script>

<template>
    <header class="mc-app-header">
        <button @click="open = true">{{ name }} · v{{ version }}</button>
    </header>

    <AppModal v-if="open" :title="name" @close="open = false">
        <div class="mc-about">
            <div class="mc-about__row">
                <span class="mc-about__label">Версия</span>
                <span class="mc-about__value">{{ version }}</span>
            </div>
            <div class="mc-about__row">
                <span class="mc-about__label">Транспорт</span>
                <span class="mc-about__value">WebSocket</span>
            </div>
        </div>
    </AppModal>
</template>

<style lang="scss" scoped>
.mc-app-header {
    text-align: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--mc-line-hard);

    button {
        color: var(--mc-fg-dim);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.2em;
        &:hover {
            color: var(--mc-fg-mute);
        }
    }
}

.mc-about {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &__row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
    }

    &__label {
        color: var(--mc-fg-mute);
    }

    &__value {
        color: var(--mc-fg);
    }
}
</style>
