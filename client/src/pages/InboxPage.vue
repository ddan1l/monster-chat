<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import ChatList from "../components/chat/ChatList.vue";
import ChatView from "../components/chat/ChatView.vue";
import { useChats } from "../composables/chat/useChats";
import { usePermissions } from "../composables/infrastructure/usePermissions";

const route = useRoute();
const chatId = computed(() => route.params.chatId as string | undefined);
const {
    status: notifStatus,
    ready: notifReady,
    isGranted: notifGranted,
    request: requestNotifications,
} = usePermissions("notifications");
const { pendingKnocks, approveChat } = useChats();
</script>

<template>
    <div
        style="
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        "
    >
        <template v-if="notifReady && !notifGranted">
            <p v-if="notifStatus === 'denied'">
                Notifications blocked. Enable them in browser settings.
            </p>
            <button v-else @click="requestNotifications">
                Enable notifications
            </button>
        </template>
        <div
            v-if="pendingKnocks.length > 0"
            style="padding: 12px; background: #fff3cd"
        >
            <p style="margin: 0 0 8px; font-weight: bold">Входящие запросы</p>
            <div
                v-for="knock in pendingKnocks"
                :key="knock.chatId"
                style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                "
            >
                <span style="font-size: 28px">{{
                    knock.peerInfo.avatar ?? "👤"
                }}</span>
                <span>{{ knock.peerInfo.name }}</span>
                <button @click="approveChat(knock.chatId)">Впустить</button>
            </div>
        </div>
        <div
            style="
                flex: 1;
                min-height: 0;
                display: grid;
                grid-gap: 20px;
                grid-template-columns: 300px 1fr;
            "
        >
            <ChatList style="background-color: #eee; overflow-y: auto" />
            <ChatView v-if="chatId" :key="chatId" :chat-id="chatId" />
        </div>
    </div>
</template>
