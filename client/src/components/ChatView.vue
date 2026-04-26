<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useChat } from "../composables/useChat";

const props = defineProps<{ chatId: string }>();

const text = ref("");
const { connected, error, messages, connect, sendMessage } = useChat(
    props.chatId
);

onMounted(connect);

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
        <p v-else-if="!connected">Connecting...</p>
        <template v-else>
            Messages:
            <ul>
                <li
                    v-for="msg in messages"
                    :key="msg.id"
                    style="margin-bottom: 15px"
                >
                    Sender: {{ msg.senderId }} <br />
                    Message: {{ msg.text }}
                </li>
            </ul>
            <input v-model="text" placeholder="Message" @keydown.enter="send" />
            <button @click="send">Send</button>
        </template>
    </div>
</template>
