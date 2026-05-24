<script setup lang="ts">
import type { PeerInfo } from "shared";

defineProps<{ peer: PeerInfo; isOnline: boolean }>();
</script>

<template>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
        <span style="font-size: 32px">{{ peer.avatar }}</span>
        <div>
            <strong>{{ peer.name }}</strong>
            <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #888">
                <span
                    :style="{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isOnline ? '#22c55e' : '#d1d5db',
                    }"
                />
                {{ isOnline ? "онлайн" : "офлайн" }}
            </div>
        </div>
    </div>
</template>
