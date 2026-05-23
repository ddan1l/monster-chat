<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import ChatList from "../components/ChatList.vue";
import ChatView from "../components/ChatView.vue";
import { useNotifications } from "../composables/useNotifications";
import { useChats } from "../composables/useChats";

const route = useRoute();
const chatId = computed(() => route.params.chatId as string | undefined);
const { permissionGranted, permissionDenied, requestPermission } =
    useNotifications();
const { pendingKnocks, approveChat } = useChats();
</script>

<template>
    <div>
        <template v-if="!permissionGranted">
            <p v-if="permissionDenied">
                Notifications blocked. Enable them in browser settings.
            </p>
            <button v-else @click="requestPermission">
                Enable notifications
            </button>
        </template>
        <div
            v-if="pendingKnocks.length > 0"
            style="padding: 12px; background: #fff3cd; margin-bottom: 12px"
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
                display: grid;
                grid-gap: 20px;
                grid-template-columns: 300px 1fr;
            "
        >
            <ChatList style="background-color: #eee" />
            <ChatView v-if="chatId" :key="chatId" :chat-id="chatId" />
        </div>
    </div>
</template>
