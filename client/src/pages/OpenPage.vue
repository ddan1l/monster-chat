<script setup lang="ts">
import { computed, onMounted } from "vue";

import { useRoute } from "vue-router";

import { useDevice } from "@shared/lib/useDevice";

const route = useRoute();
const { isWindows, isMac } = useDevice();

const to = computed(() => (route.query.to as string) ?? "/app");
const deepLink = computed(() => `monsterchat:/${to.value}`);
// Продолжить в браузере — с сохранением исходной цели (диплинки /app/join/...).
const webTo = computed(() => ({ path: "/app/web", query: { to: to.value } }));

onMounted(() => {
    window.location.href = deepLink.value;
});
</script>

<template>
    <div
        style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 16px;
            padding: 40px;
            text-align: center;
        "
    >
        <h1>Monster Chat</h1>

        <a :href="deepLink">Открыть в приложении</a>

        <a v-if="isWindows" href="/api/download/windows">Скачать для Windows</a>
        <a v-else-if="isMac" href="/api/download/mac">Скачать для Mac</a>

        <RouterLink :to="webTo" style="opacity: 0.7"
            >Продолжить в браузере</RouterLink
        >
    </div>
</template>
