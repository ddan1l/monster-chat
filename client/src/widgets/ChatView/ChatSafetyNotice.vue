<script setup lang="ts">
const emit = defineEmits<{
    openSafety: [];
}>();
</script>

<template>
    <div class="mc-safety-notice">
        Верифицируйте секретные числа, прежде чем писать сообщения —
        <button class="mc-safety-notice__link" @click="emit('openSafety')">
            Верифицировать
        </button>
    </div>
</template>

<style scoped lang="scss">
.mc-safety-notice {
    padding: 10px 0 4px;
    font-size: 13px;
    color: #888;
    text-align: center;

    &__link {
        padding: 0;
        font-size: 13px;
        color: #a78bfa;
        background: none;
        border: none;
        text-decoration: underline;
        cursor: pointer;
    }
}
</style>
