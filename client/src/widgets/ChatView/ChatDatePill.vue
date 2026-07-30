<script setup lang="ts">
// Плавающая плашка текущей даты (sticky-заголовок при виртуализации). Появляется
// на скролле и сама гаснет через таймаут — видимостью управляет родитель (prop
// visible), здесь только внешний вид и переход.
defineProps<{ label: string; visible: boolean }>();
// hover — чтобы родитель на время наведения отменил авто-скрытие (не должна
// пропадать под курсором).
const emit = defineEmits<{ open: []; hover: [boolean] }>();
</script>

<template>
    <Transition name="mc-date-pill">
        <button
            v-if="visible"
            class="mc-date-pill"
            title="Перейти к дате"
            @click="emit('open')"
            @mouseenter="emit('hover', true)"
            @mouseleave="emit('hover', false)"
        >
            <svg
                class="mc-date-pill__ico"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
            >
                <rect
                    x="2"
                    y="3"
                    width="12"
                    height="11"
                    stroke="currentColor"
                    stroke-width="1.4"
                />
                <path
                    d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="square"
                />
            </svg>
            <span class="mc-date-pill__text">{{ label }}</span>
            <svg
                class="mc-date-pill__chevron"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
            >
                <path
                    d="M3 4.5 6 7.5 9 4.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="square"
                />
            </svg>
        </button>
    </Transition>
</template>

<style scoped lang="scss">
.mc-date-pill {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    // Выше бэкдропа календаря (z 30) — при открытом календаре плашка остаётся
    // подсвеченной сверху, а не тонет в затемнении.
    z-index: 31;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    font-family: var(--mc-mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    line-height: 160%;
    color: #9aa596;
    text-transform: uppercase;
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    cursor: pointer;
    transition: border-color 0.1s;

    &:hover {
        border-color: var(--mc-acid);
    }

    // Иконка календаря слева — acid-акцент.
    &__ico {
        flex-shrink: 0;
        color: var(--mc-acid);
    }

    // Chevron справа — приглушённый.
    &__chevron {
        flex-shrink: 0;
        color: var(--mc-fg-mute);
    }
}

// Появление/скрытие: fade + лёгкий сдвиг сверху (центрирование translateX сохраняем).
.mc-date-pill-enter-active,
.mc-date-pill-leave-active {
    transition:
        opacity 0.2s,
        transform 0.2s;
}
.mc-date-pill-enter-from,
.mc-date-pill-leave-to {
    opacity: 0;
    transform: translate(-50%, -6px);
}
</style>
