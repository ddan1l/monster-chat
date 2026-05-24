<script setup lang="ts">
import type { PeerInfo } from "shared";

defineProps<{ peer: PeerInfo }>();
</script>

<template>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
        <span style="font-size: 32px">{{ peer.avatar }}</span>
        <strong>{{ peer.name }}</strong>
    </div>
</template>
