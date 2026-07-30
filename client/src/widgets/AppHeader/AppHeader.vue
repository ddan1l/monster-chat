<script setup lang="ts">
import { ref } from "vue";

import { useWsStats } from "@shared/transport/useWsStats";
import AppModal from "@shared/ui/components/AppModal.vue";

declare const __APP_VERSION__: string;
const name = import.meta.env.VITE_APP_NAME as string;
const version = __APP_VERSION__;
const isLocal = import.meta.env.DEV;

const open = ref(false);

const {
    connected,
    reconnectCount,
    sessionLabel,
    txLabel,
    rxLabel,
    signalBars,
    endpointLabel,
} = useWsStats();
</script>

<template>
    <header class="mc-app-header">
        <div class="mc-app-header__title-row">
            <span class="mc-stat">
                <span
                    class="mc-stat__dot"
                    :class="connected ? 'mc-stat__dot_on' : 'mc-stat__dot_off'"
                />
                <span class="mc-stat__key">WS</span>
                <span class="mc-stat__val">{{
                    connected ? "OPEN" : "CLOSED"
                }}</span>
            </span>

            <button class="mc-app-header__title" @click="open = true">
                {{ name }}{{ isLocal ? " · LOCAL" : "" }} · VERSION({{
                    version
                }})
            </button>

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

            <div class="mc-about__row">
                <span class="mc-about__label">ENDPOINT</span>
                <span class="mc-about__value">{{ endpointLabel }}</span>
            </div>

            <span class="mc-about__row">
                <span class="mc-about__label">SESSION</span>
                <span class="mc-about__value">{{ sessionLabel }}</span>
            </span>

            <div class="mc-about__row">
                <span class="mc-about__label">RECONN</span>
                <span class="mc-about__value">{{ reconnectCount }}</span>
            </div>

            <div class="mc-about__row">
                <span class="mc-about__label">TX/RX</span>
                <span class="mc-about__value">{{ txLabel }}/{{ rxLabel }}</span>
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
        position: absolute;

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
    padding: 0px;

    &:first-child {
        margin-right: auto;
    }

    &:last-child {
        margin-left: auto;
    }

    &__key {
        color: var(--mc-fg-dim);

        &_sig {
            transform: translateY(2px);
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
