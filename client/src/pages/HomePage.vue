<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import ChatList from "../components/ChatList.vue";
import ChatView from "../components/ChatView.vue";
import { useNotifications } from "../composables/useNotifications";

const route = useRoute();
const chatId = computed(() => route.params.chatId as string | undefined);
const { permissionGranted, permissionDenied, requestPermission } =
    useNotifications();
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
        <ChatList />
        <ChatView v-if="chatId" :key="chatId" :chat-id="chatId" />
    </div>
</template>
