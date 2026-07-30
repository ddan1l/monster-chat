<script setup lang="ts">
import { ref } from "vue";

const model = defineModel<string>({ required: true });
defineProps<{ placeholder?: string }>();
const emit = defineEmits<{ submit: [] }>();

const show = ref(false);
</script>

<template>
    <div class="mc-pwd">
        <input
            v-model="model"
            :type="show ? 'text' : 'password'"
            autocomplete="off"
            :placeholder="placeholder"
            class="mc-pwd__input"
            @keydown.enter="emit('submit')"
        />
        <button
            type="button"
            tabindex="-1"
            class="mc-pwd__toggle"
            @click="show = !show"
        >
            <svg
                v-if="show"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                />
                <path
                    d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                />
                <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            <svg
                v-else
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
        </button>
    </div>
</template>

<style scoped lang="scss">
.mc-pwd {
    position: relative;

    &__input {
        width: 100%;
        box-sizing: border-box;
        padding-right: 36px;
    }

    &__toggle {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        padding: 0;
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
    }
}
</style>
