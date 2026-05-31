<script setup lang="ts">
defineProps<{
    verified: boolean | null;
    safetyNumber: string | null;
    peerName: string;
}>();

const emit = defineEmits<{
    markVerified: [];
    removeVerification: [];
    close: [];
}>();
</script>

<template>
    <div
        style="
            border: 1px solid #333;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            font-size: 13px;
        "
    >
        <div style="display: flex; align-items: center; gap: 8px">
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                :stroke="verified ? '#22c55e' : '#888'"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline v-if="verified" points="9 12 11 14 15 10" />
            </svg>
            <strong>{{ verified ? "Verified" : "Safety Numbers" }}</strong>
        </div>

        <p style="color: #888; margin: 0">
            Сравните эти числа с <strong>{{ peerName }}</strong> голосом или
            лично. Если совпадают — нет перехватчика.
        </p>

        <div
            v-if="safetyNumber"
            style="
                font-family: monospace;
                font-size: 15px;
                letter-spacing: 0.05em;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                background: #1a1a1a;
                border-radius: 8px;
                padding: 12px;
            "
        >
            <span
                v-for="(group, i) in safetyNumber.split(' ')"
                :key="i"
                style="text-align: center; color: #e5e7eb"
            >
                {{ group }}
            </span>
        </div>
        <div v-else style="color: #555; font-style: italic">Вычисляется…</div>

        <div style="display: flex; gap: 8px">
            <button v-if="!verified" @click="emit('markVerified')">
                Верифицировать
            </button>
            <button
                v-else
                style="
                    background: none;
                    border: 1px solid #555;
                    color: #888;
                    cursor: pointer;
                "
                @click="emit('removeVerification')"
            >
                Снять верификацию
            </button>
            <button
                style="
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                "
                @click="emit('close')"
            >
                Закрыть
            </button>
        </div>
    </div>
</template>
