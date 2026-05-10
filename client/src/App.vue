<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useWs } from "./composables/useWs";
import { useNotifications } from "./composables/useNotifications";
import { useCrypto } from "./composables/useCrypto";
import { useChat } from "./composables/useChat";

const { connect, connected } = useWs();
const { init } = useNotifications();
const { init: initCrypto } = useCrypto();
const { startSync } = useChat();

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
