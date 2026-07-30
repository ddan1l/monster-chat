<script setup lang="ts">
const emit = defineEmits<{
    openSafety: [];
}>();
</script>

<template>
    <div class="mc-key-changed">
        <svg
            class="mc-key-changed__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fbbf24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>
            Ключи собеседника изменились. Сверьте секретные числа голосом или
            лично и нажмите
            <button class="mc-key-changed__link" @click="emit('openSafety')">
                Верифицировать</button
            >.
        </span>
    </div>
</template>

<style scoped lang="scss">
.mc-key-changed {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #fbbf24;
    background: #2d1a00;
    border: 1px solid #92400e;
    border-radius: 8px;

    &__icon {
        flex-shrink: 0;
    }

    &__link {
        padding: 0;
        font-size: 13px;
        color: #fbbf24;
        background: none;
        border: none;
        text-decoration: underline;
        cursor: pointer;
    }
}
</style>
