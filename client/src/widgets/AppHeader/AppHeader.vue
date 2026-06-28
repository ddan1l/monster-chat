<script setup lang="ts">
import { ref } from "vue";

import { useWsStats } from "@shared/api/useWsStats";
import { useDragScroll } from "@shared/lib/useDragScroll";
import AppModal from "@shared/ui/components/AppModal.vue";

import { usePwa } from "@features/pwa/usePwa";

declare const __APP_VERSION__: string;
const name = import.meta.env.VITE_APP_NAME as string;
const version = __APP_VERSION__;

const { isPwa } = usePwa();

const open = ref(false);
const {
    elRef: statsRow,
    hasOverflow,
    onMouseDown,
    onMouseMove,
    onMouseUp,
} = useDragScroll();

const {
    connected,
    reconnectCount,
    pingLabel,
    sessionLabel,
    txLabel,
    rxLabel,
    signalBars,
    endpointLabel,
} = useWsStats();
</script>

<template>
    <header class="mc-app-header">
        <div v-if="!isPwa" class="mc-app-header__title-row">
            <button class="mc-app-header__title" @click="open = true">
                {{ name }} · v{{ version }}
            </button>
        </div>

        <div
            ref="statsRow"
            class="mc-app-header__stats-row"
            :class="{ 'mc-app-header__stats-row_scrollable': hasOverflow }"
            @wheel.prevent="(e) => (statsRow!.scrollLeft += e.deltaY)"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
        >
            <div class="mc-app-header__stats-left">
                <span class="mc-stat">
                    <span
                        class="mc-stat__dot"
                        :class="
                            connected ? 'mc-stat__dot_on' : 'mc-stat__dot_off'
                        "
                    />
                    <span class="mc-stat__key">WS</span>
                    <span class="mc-stat__val">{{
                        connected ? "OPEN" : "CLOSED"
                    }}</span>
                </span>

                <span class="mc-stat">
                    <span class="mc-stat__key">ENDPOINT</span>
                    <span class="mc-stat__val">{{ endpointLabel }}</span>
                </span>

                <span class="mc-stat">
                    <span class="mc-stat__key">PING</span>
                    <span class="mc-stat__val">{{ pingLabel }}</span>
                </span>

                <span class="mc-stat">
                    <span class="mc-stat__key">SESSION</span>
                    <span class="mc-stat__val">{{ sessionLabel }}</span>
                </span>

                <span class="mc-stat">
                    <span class="mc-stat__key">RECONN</span>
                    <span class="mc-stat__val">{{ reconnectCount }}</span>
                </span>

                <span class="mc-stat">
                    <span class="mc-stat__key">TX</span>
                    <span class="mc-stat__val">{{ txLabel }}</span>
                    <span class="mc-stat__key">RX</span>
                    <span class="mc-stat__val">{{ rxLabel }}</span>
                </span>
            </div>

            <div class="mc-app-header__stats-right">
                <span class="mc-stat">
                    <span class="mc-stat__key mc-stat__key_sig">SIG</span>
                    <span class="mc-stat__bars">
                        <span
                            v-for="i in 3"
                            :key="i"
                            class="mc-stat__bar"
                            :class="{ 'mc-stat__bar_on': i <= signalBars }"
                            :style="{ height: `${2 + i * 3}px` }"
                        />
                    </span>
                </span>
            </div>
        </div>
    </header>

    <AppModal :is-visible="open" :title="name" @close="open = false">
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
    border-bottom: 1px solid var(--mc-line-hard);

    &__title-row {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
    }

    &__title {
        color: var(--mc-fg-dim);
        font-size: 0.6875em;
        font-weight: 600;
        letter-spacing: 0.1em;
        font-family: var(--mc-mono);

        &:hover {
            color: var(--mc-fg-mute);
        }
    }

    &__stats-row {
        display: flex;
        align-items: center;
        border-top: 1px solid var(--mc-line-hard);
        overflow-x: auto;
        min-width: 0;
        scrollbar-width: none;
        user-select: none;

        &_scrollable {
            cursor: grab;

            &:active {
                cursor: grabbing;
            }
        }

        &::-webkit-scrollbar {
            display: none;
        }
    }

    &__stats-left {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: max-content;
    }

    &__stats-right {
        display: flex;
        align-items: center;
        min-width: max-content;
    }
}

.mc-stat {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
    font-size: 0.6875em;
    font-family: var(--mc-mono);
    letter-spacing: 0.05em;
    font-weight: 600;
    padding: 8px 16px;
    border-right: 1px solid var(--mc-line-hard);

    &:only-child {
        border-right: none;
    }

    &__key {
        color: var(--mc-fg-dim);

        &_sig {
            transform: translateY(1px);
        }
    }

    &__val {
        color: var(--mc-fg);

        &_acid {
            color: var(--mc-acid);
        }
    }

    &__dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;

        &_on {
            background: var(--mc-acid);
            box-shadow: 0 0 6px var(--mc-acid-glow);
        }

        &_off {
            background: #555;
        }
    }

    &__bars {
        display: flex;
        align-items: flex-end;
        gap: 2px;
    }

    &__bar {
        width: 3px;
        border-radius: 1px;
        background: #333;

        &_on {
            background: var(--mc-acid);
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
