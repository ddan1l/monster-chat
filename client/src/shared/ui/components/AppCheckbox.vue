<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
</script>

<template>
    <label class="mc-checkbox">
        <input v-model="model" type="checkbox" class="mc-checkbox__input" />
        <svg
            class="mc-checkbox__box"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
        >
            <rect
                class="mc-checkbox__fill"
                x="1"
                y="1"
                width="18"
                height="18"
            />
            <path
                class="mc-checkbox__check"
                d="M5 10.2 8.4 13.6 15 6.5"
                fill="none"
                stroke-width="2.4"
                stroke-linecap="square"
                stroke-linejoin="miter"
            />
        </svg>
        <span class="mc-checkbox__label"><slot /></span>
    </label>
</template>

<style scoped lang="scss">
.mc-checkbox {
    display: inline-flex;
    align-items: center;
    width: max-content;
    gap: 12px;
    font-size: 13px;
    color: var(--mc-fg-dim);
    cursor: pointer;
    user-select: none;

    &__input {
        position: absolute;
        width: 0;
        height: 0;
        opacity: 0;
    }

    &__box {
        flex-shrink: 0;
    }

    // Рамка (пусто) → заливка acid при отметке.
    &__fill {
        fill: transparent;
        stroke: var(--mc-line-hard);
        stroke-width: 1;
        transition:
            fill 0.1s,
            stroke 0.1s;
    }

    // Галочка — скрыта, появляется при отметке.
    &__check {
        stroke: var(--mc-fg-message);
        opacity: 0;
        transition: opacity 0.1s;
    }

    &:hover .mc-checkbox__fill {
        stroke: var(--mc-acid);
    }
}

.mc-checkbox__input:checked + .mc-checkbox__box .mc-checkbox__fill {
    fill: var(--mc-acid);
    stroke: var(--mc-acid);
}

.mc-checkbox__input:checked + .mc-checkbox__box .mc-checkbox__check {
    opacity: 1;
}

.mc-checkbox__input:focus-visible + .mc-checkbox__box {
    outline: 2px solid var(--mc-acid);
    outline-offset: 1px;
}
</style>
