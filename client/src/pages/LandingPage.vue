<script setup lang="ts">
import { useRouter } from "vue-router";

import { useDevice } from "@shared/lib/useDevice";
import { canInstallApp, isTauri } from "@shared/lib/useTauri";

const router = useRouter();
const { isWindows, isMac } = useDevice();

function openApp() {
    window.location.href = "monsterchat://app";
}
</script>

<template>
    <div
        style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 24px;
            padding: 40px;
            text-align: center;
        "
    >
        <h1>Monster Chat</h1>
        <p style="color: #888; max-width: 400px">
            Мессенджер с end-to-end шифрованием.
        </p>

        <template v-if="isTauri">
            <button @click="router.push('/app')">Открыть</button>
        </template>

        <template v-else-if="canInstallApp">
            <button @click="openApp">Открыть приложение</button>
            <div style="display: flex; flex-direction: column; gap: 8px">
                <a
                    v-if="isWindows"
                    href="/api/download/windows"
                    style="font-size: 14px; color: #888"
                >
                    Скачать для Windows
                </a>
                <a
                    v-if="isMac"
                    href="/api/download/mac"
                    style="font-size: 14px; color: #888"
                >
                    Скачать для Mac
                </a>
            </div>
        </template>

        <template v-else>
            <p style="font-size: 14px; color: #888; max-width: 320px">
                Добавьте сайт на главный экран и разрешите уведомления для
                лучшего опыта.
            </p>
            <button @click="router.push('/app')">Открыть веб версию</button>
        </template>
    </div>
</template>
