<script setup lang="ts">
import { watch, ref, onBeforeUnmount } from "vue";

import IconClose from "@shared/ui/icons/IconClose.vue";
import IconDot from "@shared/ui/icons/IconDot.vue";

const props = defineProps<{
    title?: string;
    maxWidth?: number;
    isVisible?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

const localVisible = ref(false);
const ANIMATION_DURATION = 150;

const closeModal = () => {
    localVisible.value = false;
    document.removeEventListener("keydown", onKey);
    setTimeout(() => {
        emit("close");
    }, ANIMATION_DURATION);
};

const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        closeModal();
    }
};

const close = () => {
    if (!localVisible.value) return;
    closeModal();
};

watch(
    () => props.isVisible,
    (newVal) => {
        if (newVal) {
            localVisible.value = true;
            document.addEventListener("keydown", onKey);
        } else {
            closeModal();
        }
    },
    { immediate: true }
);

onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKey);
});
</script>

<template>
    <Teleport to="body">
        <Transition appear name="mc-modal">
            <div
                v-if="localVisible"
                class="mc-modal-overlay"
                @click.self="close"
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
                            <IconDot />
                            {{ title }}
                        </h5>
                        <span v-else />
                        <button class="button-sm" @click="close">
                            <IconClose />
                        </button>
                    </div>
                    <div class="mc-modal__body">
                        <slot :close-modal="closeModal" />
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
        display: flex;
        align-items: center;
        gap: 10px;
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
        padding: 22px var(--mc-modal-padding);
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
