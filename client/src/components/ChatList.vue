<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useChat } from "../composables/useChat";

const router = useRouter();
const route = useRoute();
const { chats, loadChats, createChat } = useChat();

onMounted(loadChats);

async function handleCreateChat() {
    const chat = await createChat();
    router.push(`/chat/${chat.id}`);
}
</script>

<template>
    <div>
        <ul>
            <li
                v-for="chat in chats"
                :key="chat.id"
                style="cursor: pointer; margin-top: 15px"
                :class="{ active: route.params.chatId === chat.id }"
                @click="router.push(`/chat/${chat.id}`)"
            >
                Chat: {{ chat.id }}
            </li>
        </ul>

        <button
            style="margin: 10px; margin-left: 30px"
            @click="handleCreateChat"
        >
            New chat
        </button>
    </div>
</template>
