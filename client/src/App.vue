<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useWs } from "./composables/infrastructure/useWs";
import { useChatNotification } from "./composables/chat/useChatNotification";
import { useCrypto } from "./composables/crypto/useCrypto";
import { useChats } from "./composables/chat/useChats";

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
