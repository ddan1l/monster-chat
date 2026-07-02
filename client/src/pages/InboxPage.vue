<script setup lang="ts">
import { computed } from "vue";

import { useRoute } from "vue-router";

import { usePermissions } from "@shared/lib/usePermissions";
import { isTauri } from "@shared/lib/useTauri";

import ChatList from "@widgets/ChatList/ChatList.vue";
import ChatView from "@widgets/ChatView/ChatView.vue";

const route = useRoute();
const chatId = computed(() => route.params.chatId as string | undefined);
const {
    status: notifStatus,
    ready: notifReady,
    isGranted: notifGranted,
    request: requestNotifications,
} = usePermissions("notifications");
</script>

<template>
    <div class="mc-inbox-page">
        <template v-if="!isTauri && notifReady && !notifGranted">
            <p v-if="notifStatus === 'denied'">
                Notifications blocked. Enable them in browser settings.
            </p>
            <button v-else @click="requestNotifications">
                Enable notifications
            </button>
        </template>

        <div class="mc-inbox-container">
            <ChatList />
            <ChatView v-if="chatId" :key="chatId" :chat-id="chatId" />
        </div>
    </div>
</template>
<style lang="scss" scoped>
.mc-inbox-page {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}
.mc-inbox-container {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 320px 1fr;
}
</style>
