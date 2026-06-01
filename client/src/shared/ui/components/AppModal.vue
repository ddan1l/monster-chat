<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import IconClose from "@shared/ui/icons/IconClose.vue";

const props = defineProps<{
    open: boolean;
    title?: string;
    maxWidth?: number;
}>();
const emit = defineEmits<{ close: [] }>();

function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") emit("close");
}

watch(
    () => props.open,
    (val) => {
        if (val) document.addEventListener("keydown", onKey);
        else document.removeEventListener("keydown", onKey);
    }
);

onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<template>
    <Teleport to="body">
        <Transition name="mc-modal">
            <div
                v-if="open"
                class="mc-modal-overlay"
                @click.self="emit('close')"
            >
                <div
                    class="mc-modal"
                    :style="{
                        maxWidth: `${maxWidth ?? 420}px`,
                        minWidth: `${maxWidth ?? 420}px`,
                    }"
                >
                    <div class="mc-modal__header">
                        <h5 v-if="title" class="mc-modal__title">
                            {{ title }}
                        </h5>
                        <span v-else />
                        <button class="button-sm" @click="emit('close')">
                            <IconClose />
                        </button>
                    </div>
                    <div class="mc-modal__body">
                        <slot />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
.mc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
    z-index: 100;
}

.mc-modal {
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    max-height: calc(100vh - 100px);
    display: flex;
    flex-direction: column;

    &__title {
        text-transform: uppercase;
        font-family: var(--mc-mono);
    }

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--mc-line);
        background-color: var(--mc-bg-rail);
        flex-shrink: 0;
    }

    &__body {
        padding: 20px 16px;
        overflow-y: auto;
        flex: 1;
        min-height: 0;
    }
}

.mc-modal-enter-active,
.mc-modal-leave-active {
    transition: opacity 0.15s ease;

    .mc-modal {
        transition:
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            opacity 0.15s ease;
    }
}

.mc-modal-enter-from,
.mc-modal-leave-to {
    opacity: 0;

    .mc-modal {
        transform: translateY(-15px);
        opacity: 0;
    }
}
</style>
