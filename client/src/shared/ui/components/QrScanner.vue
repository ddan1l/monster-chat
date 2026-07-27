<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import jsQR from "jsqr";

const emit = defineEmits<{ decode: [string] }>();

const video = ref<HTMLVideoElement | null>(null);
const error = ref<string | null>(null);

let stream: MediaStream | null = null;
let raf = 0;
const canvas = document.createElement("canvas");

async function start(): Promise<void> {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
        });
        if (!video.value) return;
        video.value.srcObject = stream;
        await video.value.play();
        scan();
    } catch {
        error.value = "Нет доступа к камере — используйте текст/код.";
    }
}

// Кадр за кадром ищем QR; при находке эмитим данные и останавливаемся.
function scan(): void {
    const v = video.value;
    if (!v || v.readyState !== v.HAVE_ENOUGH_DATA) {
        raf = requestAnimationFrame(scan);
        return;
    }
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code?.data) {
        emit("decode", code.data);
        return;
    }
    raf = requestAnimationFrame(scan);
}

function stop(): void {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
}

onMounted(start);
onUnmounted(stop);
</script>

<template>
    <div>
        <video
            ref="video"
            playsinline
            muted
            style="width: 100%; max-width: 320px; border-radius: 8px"
        />
        <p v-if="error" style="color: #f87171; font-size: 12px; margin: 0">
            {{ error }}
        </p>
    </div>
</template>
