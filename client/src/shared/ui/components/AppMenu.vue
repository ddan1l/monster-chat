<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";

import {
    autoUpdate,
    flip,
    offset,
    shift,
    useFloating,
    type Placement,
    type VirtualElement,
} from "@floating-ui/vue";

const props = withDefaults(
    defineProps<{
        placement?: Placement;
        offset?: number;
        anchor?: HTMLElement | null;
    }>(),
    {
        placement: "bottom-end",
        offset: 6,
        anchor: null,
    }
);

const isOpen = ref(false);
const trigger = ref<HTMLElement | null>(null);
const floating = ref<HTMLElement | null>(null);
const point = ref<{ x: number; y: number } | null>(null);

const virtualEl = computed<VirtualElement | null>(() => {
    const p = point.value;
    if (!p) return null;
    return { getBoundingClientRect: () => new DOMRect(p.x, p.y, 0, 0) };
});

const reference = computed(
    () => virtualEl.value ?? props.anchor ?? trigger.value
);

const { floatingStyles } = useFloating(reference, floating, {
    placement: props.placement,
    middleware: [offset(props.offset), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    transform: false,
    open: isOpen,
});

function open(): void {
    isOpen.value = true;
}

function openAt(e: MouseEvent): void {
    point.value = { x: e.clientX, y: e.clientY };
    isOpen.value = true;
}

function close(): void {
    isOpen.value = false;
    point.value = null;
}

function toggle(): void {
    isOpen.value ? close() : open();
}

function onPointerDown(e: PointerEvent): void {
    const target = e.target as Node;
    const anchorEl = props.anchor ?? trigger.value;
    if (anchorEl?.contains(target) || floating.value?.contains(target)) {
        return;
    }
    close();
}

function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape") close();
}

watch(isOpen, (value) => {
    if (value) {
        document.addEventListener("pointerdown", onPointerDown, true);
        document.addEventListener("keydown", onKey);
    } else {
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKey);
    }
});

onBeforeUnmount(() => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKey);
});

defineExpose({ open, openAt, close, toggle });
</script>

<template>
    <div
        v-if="!anchor"
        ref="trigger"
        class="mc-menu__trigger"
        @click="toggle"
        @contextmenu.prevent="open"
    >
        <slot name="trigger" :is-open="isOpen" />
    </div>

    <Teleport to="body">
        <div
            v-if="isOpen"
            class="mc-menu__backdrop"
            @wheel.prevent
            @touchmove.prevent
        />
        <Transition name="mc-menu">
            <div
                v-if="isOpen"
                ref="floating"
                class="mc-menu"
                :style="floatingStyles"
                role="menu"
            >
                <slot :close="close" />
            </div>
        </Transition>
    </Teleport>
</template>

<style lang="scss" scoped>
.mc-menu {
    z-index: 200;
    min-width: 180px;
    padding: 4px;
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    display: flex;
    flex-direction: column;

    &__trigger {
        display: inline-flex;
    }

    &__backdrop {
        position: fixed;
        inset: 0;
        z-index: 199;
        cursor: default;
    }
}

.mc-menu-enter-active,
.mc-menu-leave-active {
    transition:
        opacity 0.12s ease,
        transform 0.12s ease;
}

.mc-menu-enter-from,
.mc-menu-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
