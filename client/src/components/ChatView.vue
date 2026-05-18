<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useChat } from "../composables/useChat";

const props = defineProps<{ chatId: string }>();

const text = ref("");
const { error, messages, chat, peer, connectChat, sendMessage } = useChat(
    props.chatId
);

onMounted(connectChat);

function send() {
    if (text.value.trim()) {
        sendMessage(text.value.trim());
        text.value = "";
    }
}
</script>

<template>
    <div>
        <p v-if="error">{{ error }}</p>
        <template v-if="chat">
            <template v-if="!chat.isActive">
                <p>Ожидание участника, вот ссылочка:</p>
                <a v-if="chat.joinLink" :href="chat.joinLink">
                    {{ chat.joinLink }}</a
                >
            </template>
            <template v-else>
                <div
                    v-if="peer"
                    style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 12px;
                    "
                >
                    <span style="font-size: 32px">{{ peer.avatar }}</span>
                    <strong>{{ peer.name }}</strong>
                </div>
                <ul>
                    <li
                        v-for="msg in messages"
                        :key="msg.id"
                        style="margin-bottom: 15px"
                    >
                        Message: {{ msg.text }}
                    </li>
                </ul>
                <input
                    v-model="text"
                    placeholder="Message"
                    :disabled="!!error"
                    @keydown.enter="send"
                />
                <button :disabled="!!error" @click="send">Send</button>
            </template>
        </template>
    </div>
</template>
