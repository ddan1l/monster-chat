<script setup lang="ts">
import { computed, ref } from "vue";

import { dateKey, startOfDay } from "@entities/message/useMessages";

const props = defineProps<{
    // Границы диапазона сообщений чата и дни (YYYY-MM-DD), в которые они есть.
    min: number;
    max: number;
    days: Set<string>;
    // Текущая (открытая) дата — подсвечиваем её в сетке.
    selected?: number;
}>();

const selectedKey = computed(() =>
    props.selected != null ? dateKey(props.selected) : null
);

const emit = defineEmits<{
    pick: [ts: number];
    close: [];
}>();

const MONTHS = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Просматриваемый месяц: стартуем с месяца последнего сообщения.
const view = ref(new Date(props.max));
view.value.setDate(1);

const title = computed(
    () => `${MONTHS[view.value.getMonth()]} ${view.value.getFullYear()}`
);

// Границы навигации — первые числа месяцев min/max.
const minMonth = computed(() => {
    const d = new Date(props.min);
    return d.getFullYear() * 12 + d.getMonth();
});
const maxMonth = computed(() => {
    const d = new Date(props.max);
    return d.getFullYear() * 12 + d.getMonth();
});
const viewMonthIdx = computed(
    () => view.value.getFullYear() * 12 + view.value.getMonth()
);
const canPrev = computed(() => viewMonthIdx.value > minMonth.value);
const canNext = computed(() => viewMonthIdx.value < maxMonth.value);

// Ячейки сетки: ведущие пустышки (до первого дня, Пн-первый) + дни месяца.
interface Cell {
    day: number;
    ts: number;
    key: string;
    hasMessages: boolean;
    selected: boolean;
}
const cells = computed<(Cell | null)[]>(() => {
    const year = view.value.getFullYear();
    const month = view.value.getMonth();
    const first = new Date(year, month, 1);
    // getDay(): 0=Вс..6=Сб → сдвигаем к Пн-первому (0=Пн..6=Вс).
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Cell | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
        const ts = new Date(year, month, day).getTime();
        const key = dateKey(ts);
        result.push({
            day,
            ts,
            key,
            hasMessages: props.days.has(key),
            selected: key === selectedKey.value,
        });
    }
    return result;
});

function prev() {
    if (!canPrev.value) {
        return;
    }
    view.value = new Date(
        view.value.getFullYear(),
        view.value.getMonth() - 1,
        1
    );
}
function next() {
    if (!canNext.value) {
        return;
    }
    view.value = new Date(
        view.value.getFullYear(),
        view.value.getMonth() + 1,
        1
    );
}
function pick(cell: Cell) {
    if (!cell.hasMessages) {
        return;
    }
    emit("pick", startOfDay(cell.ts));
}
</script>

<template>
    <div class="mc-cal-backdrop" @click.self="emit('close')">
        <div class="mc-cal" role="dialog" aria-label="Переход к дате">
            <header class="mc-cal__head">
                <button
                    class="mc-cal__nav"
                    :disabled="!canPrev"
                    aria-label="Предыдущий месяц"
                    @click="prev"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M15 6l-6 6 6 6" />
                    </svg>
                </button>
                <span class="mc-cal__title">{{ title }}</span>
                <button
                    class="mc-cal__nav"
                    :disabled="!canNext"
                    aria-label="Следующий месяц"
                    @click="next"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                </button>
            </header>

            <div class="mc-cal__weekdays">
                <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
            </div>

            <div class="mc-cal__grid">
                <template v-for="(cell, i) in cells" :key="i">
                    <span
                        v-if="!cell"
                        class="mc-cal__cell mc-cal__cell_empty"
                    />
                    <button
                        v-else
                        class="mc-cal__cell"
                        :class="{
                            'mc-cal__cell_has': cell.hasMessages,
                            'mc-cal__cell_selected': cell.selected,
                        }"
                        :disabled="!cell.hasMessages"
                        @click="pick(cell)"
                    >
                        {{ cell.day }}
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.mc-cal-backdrop {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 48px;
    background: rgba(0, 0, 0, 0.35);
}

.mc-cal {
    width: 300px;
    padding: 16px;
    font-family: var(--mc-mono);
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);

    &__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }

    &__title {
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--mc-acid);
    }

    &__nav {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        font-size: 16px;
        line-height: 1;
        color: var(--mc-fg);
        background: none;
        border: 1px solid var(--mc-line-hard);
        cursor: pointer;
        transition:
            color 0.1s,
            border-color 0.1s;

        &:hover:not(:disabled) {
            color: var(--mc-acid);
            border-color: var(--mc-acid);
        }

        &:disabled {
            opacity: 0.3;
            cursor: default;
        }
    }

    &__weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        margin-bottom: 8px;

        span {
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--mc-fg-mute);
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
    }

    &__cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--mc-mono);
        font-size: 13px;
        font-weight: 700;
        color: var(--mc-fg-dim);
        background: none;
        border: 1px solid transparent;

        &_empty {
            pointer-events: none;
        }

        // День с сообщениями — светлый, кликабельный.
        &_has {
            color: var(--mc-fg);
            cursor: pointer;

            &:hover {
                border-color: var(--mc-acid);
            }
        }

        // Текущая (открытая) дата — залита acid.
        &_selected {
            color: var(--mc-bg-window);
            background: var(--mc-acid);
            border-color: var(--mc-acid);

            &:hover {
                background: var(--mc-acid);
            }
        }

        &:disabled:not(&_has) {
            opacity: 0.4;
            cursor: default;
        }
    }
}
</style>
