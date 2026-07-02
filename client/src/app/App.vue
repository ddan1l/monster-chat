<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";

import { useRouter } from "vue-router";

import { useWs } from "@shared/api/useWs";
import { useCrypto } from "@shared/crypto/useCrypto";
import { requestNotificationPermission } from "@shared/lib/useNotifications";

import { useChatNotification } from "@entities/chat/useChatNotification";
import { useChats } from "@entities/chat/useChats";
import { useKnocks } from "@entities/chat/usePendingKnocks";
import { usePeers } from "@entities/peer/usePeers";

import { subscribePush } from "@features/push-notifications/usePushNotifications";
import { usePwa } from "@features/pwa/usePwa";

import AppHeader from "@widgets/AppHeader/AppHeader.vue";

const { connect, connected } = useWs();
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

const { signKeyPair, exportSignPublicKey } = useCrypto();
const { startSync: syncPeers, announceOnline } = usePeers();

useChats().startSync();
useKnocks().startSync();
syncPeers();
useChatNotification().startSync();
const { isPwa } = usePwa();

onMounted(() => {
    connect();
    requestNotificationPermission();
});

watch([connected, signKeyPair], async ([isConnected, keys]) => {
    if (isConnected && keys) {
        announceOnline();
        const signPubKey = await exportSignPublicKey();
        subscribePush(signPubKey);
    }
});
</script>

<template>
    <div class="mc-app" :class="{ 'mc-app_pwa': isPwa }">
        <div class="mc-app-container">
            <AppHeader />
            <RouterView class="mc-view" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-app {
    padding: 20px;
    height: 100vh;
    overflow: hidden;
    &_pwa {
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
</style>
