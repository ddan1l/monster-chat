<script setup lang="ts">
import { ref, watch, onMounted } from "vue";

import QRCode from "qrcode";

const props = defineProps<{ data: string; size?: number }>();

const canvas = ref<HTMLCanvasElement | null>(null);
const error = ref<string | null>(null);

// errorCorrectionLevel "L" — минимальная коррекция → максимум данных влезает
// (бандл линковки бывает крупным). Если всё равно не влезло — QRCode бросает.
async function render(): Promise<void> {
    error.value = null;
    if (!canvas.value || !props.data) {
        return;
    }
    try {
        await QRCode.toCanvas(canvas.value, props.data, {
            width: props.size ?? 240,
            margin: 1,
            errorCorrectionLevel: "L",
        });
    } catch {
        error.value = "Слишком много данных для QR — используйте текст.";
    }
}

onMounted(render);
watch(() => props.data, render);
</script>

<template>
    <div>
        <canvas
            v-show="!error"
            ref="canvas"
            style="border-radius: 8px; background: #fff"
        />
        <p v-if="error" style="color: #f59e0b; font-size: 12px; margin: 0">
            {{ error }}
        </p>
    </div>
</template>
