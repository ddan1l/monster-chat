<script setup lang="ts">
import { computed, ref } from "vue";

import { dateKey, startOfDay } from "@entities/message/useMessages";

const props = defineProps<{
    // Границы диапазона сообщений чата и дни (YYYY-MM-DD), в которые они есть.
    min: number;
    max: number;
    days: Set<string>;
}>();

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
        result.push({ day, ts, key, hasMessages: props.days.has(key) });
    }
    return result;
});

function prev() {
    if (!canPrev.value) return;
    view.value = new Date(
        view.value.getFullYear(),
        view.value.getMonth() - 1,
        1
    );
}
function next() {
    if (!canNext.value) return;
    view.value = new Date(
        view.value.getFullYear(),
        view.value.getMonth() + 1,
        1
    );
}
function pick(cell: Cell) {
    if (!cell.hasMessages) return;
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
                    ‹
                </button>
                <span class="mc-cal__title">{{ title }}</span>
                <button
                    class="mc-cal__nav"
                    :disabled="!canNext"
                    aria-label="Следующий месяц"
                    @click="next"
                >
                    ›
                </button>
            </header>

            <div class="mc-cal__weekdays">
                <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
            </div>

            <div class="mc-cal__grid">
                <template v-for="(cell, i) in cells" :key="i">
                    <span
                        v-if="!cell"
                        class="mc-cal__cell mc-cal__cell--empty"
                    />
                    <button
                        v-else
                        class="mc-cal__cell"
                        :class="{ 'mc-cal__cell--has': cell.hasMessages }"
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
    width: 280px;
    padding: 12px;
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);

    &__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    &__title {
        font-size: 14px;
        font-weight: 700;
        color: var(--mc-fg);
    }

    &__nav {
        width: 28px;
        height: 28px;
        font-size: 18px;
        line-height: 1;
        color: var(--mc-fg);
        background: none;
        border: 1px solid var(--mc-line-hard);
        border-radius: 6px;
        cursor: pointer;

        &:disabled {
            opacity: 0.3;
            cursor: default;
        }
    }

    &__weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        margin-bottom: 4px;

        span {
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            color: var(--mc-fg-mute);
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    }

    &__cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: var(--mc-fg-dim);
        background: none;
        border: none;
        border-radius: 6px;

        &--empty {
            pointer-events: none;
        }

        &--has {
            color: var(--mc-acid);
            font-weight: 700;
            cursor: pointer;
            border: 1px solid var(--mc-line-hard);

            &:hover {
                background: var(--mc-acid);
                color: var(--mc-bg-window);
            }
        }

        &:disabled:not(&--has) {
            opacity: 0.35;
            cursor: default;
        }
    }
}
</style>
