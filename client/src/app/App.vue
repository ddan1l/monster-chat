<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useWs } from "@shared/api/useWs";
import { useChatNotification } from "@entities/chat/useChatNotification";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useChats } from "@entities/chat/useChats";

const { connect, connected } = useWs();
const { init } = useChatNotification();
const { signKeyPair } = useCrypto();
const { startSync } = useChats();

startSync();

onMounted(() => {
    connect();
});

watch([connected, signKeyPair], ([isConnected, keys]) => {
    if (isConnected && keys) init();
});
</script>

<template>
    <RouterView v-if="connected" />
</template>
