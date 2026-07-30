<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";

import { useRouter } from "vue-router";

import { useCrypto } from "@shared/crypto/useCrypto";
import { requestNotificationPermission } from "@shared/lib/useNotifications";
import { isTauri } from "@shared/lib/useTauri";
import { checkForUpdates, useUpdater } from "@shared/lib/useUpdater";
import { useWs } from "@shared/transport/useWs";

import { useChatNotification } from "@entities/chat/useChatNotification";
import { useChats } from "@entities/chat/useChats";
import { useKnocks } from "@entities/chat/usePendingKnocks";
import { useOutbox } from "@entities/message/useOutbox";
import { usePeers } from "@entities/peer/usePeers";

import { useEpochKeys } from "@features/auth/useEpochKeys";
import { subscribePush } from "@features/push-notifications/usePushNotifications";
import { usePwa } from "@features/pwa/usePwa";

import AppHeader from "@widgets/AppHeader/AppHeader.vue";
import AppSidebar from "@widgets/AppSidebar/AppSidebar.vue";

const { connect, connected, send } = useWs();
const { exportSignedPrekey } = useEpochKeys();
const router = useRouter();

function onSwMessage(event: MessageEvent) {
    if (event.data?.type === "navigate") {
        router.push(event.data.url);
    }
}

onMounted(() =>
    navigator.serviceWorker?.addEventListener("message", onSwMessage)
);
onUnmounted(() =>
    navigator.serviceWorker?.removeEventListener("message", onSwMessage)
);

const { signKeyPair } = useCrypto();
const peers = usePeers();
const { loadChats } = useChats();

useChats().startSync();
useKnocks().startSync();
useChatNotification().startSync();
useOutbox().startSync();

loadChats();
peers.startSync();
const { isPwa } = usePwa();
const { updateAvailable, installUpdate } = useUpdater();

// Подключаемся к WS только когда ключ подписи разблокирован — иначе нечем
// подписать challenge. connect() идемпотентен.
watch(signKeyPair, (keys) => keys && connect(), { immediate: true });

onMounted(async () => {
    requestNotificationPermission();
    checkForUpdates();

    if (isTauri) {
        const { onOpenUrl, getCurrent } =
            await import("@tauri-apps/plugin-deep-link");
        const { listen } = await import("@tauri-apps/api/event");
        const handleUrl = (url: string) => {
            const path = url.replace(/^monsterchat:\/\//, "/");
            router.push(path);
        };
        const current = await getCurrent();
        if (current) {
            current.forEach(handleUrl);
        }
        onOpenUrl((urls) => urls.forEach(handleUrl));
        listen<string>("deep-link-url", (e) => handleUrl(e.payload));
    }
});

watch([connected, signKeyPair], async ([isConnected, keys]) => {
    if (isConnected && keys) {
        peers.announceOnline();
        // Ре-шеринг peer-инфо своим устройствам — чтобы отставшие сошлись.
        peers.reshareOwnPeers();
        subscribePush();
        // Публикуем текущий эпохальный prekey устройства (FS): пиры будут
        // шифровать входящие под него. Пока сообщения v1 — это аддитивно.
        send({ type: "publish_prekey", payload: await exportSignedPrekey() });
    }
});
</script>

<template>
    <div class="mc-app" :class="{ 'mc-app_pwa': isPwa }">
        <div class="mc-app-container">
            <div v-if="updateAvailable" class="mc-update-banner">
                <span>Доступна новая версия</span>
                <button class="mc-update-btn" @click="installUpdate">
                    Обновить
                </button>
            </div>
            <AppHeader />
            <div class="mc-body">
                <AppSidebar />
                <RouterView class="mc-view" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-app {
    padding: 10px;
    height: 100vh;
    overflow: hidden;
    &_pwa {
        padding: 0;
    }
    @media (max-width: bp.$mobile) {
        padding: 0;
    }
}
.mc-app-container {
    border: 1px solid var(--mc-line-hard);
    background-color: var(--mc-bg-window);
    height: 100%;
    display: flex;
    flex-direction: column;
}
.mc-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row;
    @media (max-width: bp.$mobile) {
        flex-direction: column-reverse;
    }
}
.mc-view {
    flex: 1;
    min-width: 0;
}
.mc-update-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--mc-bg-sel);
    border-bottom: 1px solid var(--mc-line);
    font-size: 13px;
    color: var(--mc-fg);
}
.mc-update-btn {
    padding: 4px 12px;
    border-radius: 6px;
    border: 1px solid var(--mc-acid);
    background: transparent;
    color: var(--mc-acid);
    font-size: 12px;
    cursor: pointer;
    &:hover {
        background: var(--mc-acid);
        color: var(--mc-bg);
    }
}
</style>
