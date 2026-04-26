<script setup lang="ts">
import { onMounted } from "vue";
import { useNotifications } from "./composables/useNotifications";

const { init } = useNotifications();

onMounted(init);
</script>

<template>
    <RouterView />
</template>
