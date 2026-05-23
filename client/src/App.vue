<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useWs } from "./composables/useWs";
import { useNotifications } from "./composables/useNotifications";
import { useCrypto } from "./composables/useCrypto";
import { useChats } from "./composables/useChats";

const { connect, connected } = useWs();
const { init } = useNotifications();
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
