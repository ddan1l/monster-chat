<script setup lang="ts">
withDefaults(
    defineProps<{
        modelValue?: string;
        placeholder?: string;
        type?: string;
    }>(),
    {
        modelValue: "",
        placeholder: "",
        type: "text",
    }
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
    <div class="mc-input-wrap">
        <span v-if="$slots.icon" class="mc-input-wrap__icon">
            <slot name="icon" />
        </span>
        <input
            class="mc-input"
            :type="type"
            :value="modelValue"
            :placeholder="placeholder"
            @input="
                $emit(
                    'update:modelValue',
                    ($event.target as HTMLInputElement).value
                )
            "
        />
    </div>
</template>

<style lang="scss" scoped>
.mc-input-wrap {
    display: flex;
    align-items: center;
    width: 100%;
    background: var(--mc-bg-input);
    border: 1px solid var(--mc-line);
    transition: border-color 0.1s;

    &:focus-within {
        border-color: var(--mc-acid);
    }

    &__icon {
        display: flex;
        align-items: center;
        padding: 0 4px 0 8px;
        color: var(--mc-fg-dim);
        pointer-events: none;
        flex-shrink: 0;

        :deep(svg) {
            width: 16px;
            height: 16px;
        }
    }
}

.mc-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    background: transparent;
    border: none;
    color: var(--mc-fg);
    font-family: var(--mc-mono);
    font-size: 0.8125em;
    font-weight: 600;
    padding: 7px 10px;
    outline: none;

    &::placeholder {
        color: var(--mc-fg-dim);
        font-weight: 500;
    }
}
</style>
