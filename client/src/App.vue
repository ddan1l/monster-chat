<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useWs } from "./composables/infrastructure/useWs";
import { useChatNotification } from "./composables/chat/useChatNotification";
import { useCrypto } from "./composables/infrastructure/useCrypto";
import { useChats } from "./composables/chat/useChats";

const { connect, connected } = useWs();
const { init } = useChatNotification();
const { init: initCrypto } = useCrypto();
const { startSync } = useChats();

startSync();

onMounted(async () => {
    await initCrypto();
    connect();
});

watch(connected, (val) => {
    if (val) init();
});
</script>

<template>
    <RouterView v-if="connected" />
</template>
