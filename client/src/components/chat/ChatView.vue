<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useChatSession } from "../../composables/chat/useChatSession";
import { activeChatId } from "../../composables/chat/useChats";
import { useChatNotification } from "../../composables/chat/useChatNotification";
import ChatPending from "./ChatPending.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatMessages from "./ChatMessages.vue";
import ChatEditor from "./ChatEditor.vue";

const props = defineProps<{ chatId: string }>();

const editingNonce = ref<string | null>(null);
const editingText = ref("");

const {
    error,
    messages,
    chat,
    peer,
    connect,
    sendMessage,
    editMessage,
    markAsRead,
} = useChatSession(props.chatId);
const { clearUnread } = useChatNotification();

onMounted(async () => {
    activeChatId.value = props.chatId;
    clearUnread(props.chatId);
    await connect();
});

onUnmounted(() => {
    activeChatId.value = null;
});

function handleEditStart(nonce: string, text: string) {
    editingNonce.value = nonce;
    editingText.value = text;
}

function handleEditCancel() {
    editingNonce.value = null;
    editingText.value = "";
}

async function handleEditSubmit(nonce: string, newText: string) {
    await editMessage(nonce, newText);
    handleEditCancel();
}
</script>

<template>
    <div style="display: flex; flex-direction: column; height: 100%">
        <p v-if="error" style="color: red">{{ error }}</p>

        <template v-if="chat">
            <ChatPending v-if="!chat.isActive" :chat="chat" />

            <template v-else-if="chat.isActive">
                <ChatHeader v-if="peer" :peer="peer" />

                <ChatMessages
                    :messages="messages"
                    :peer="peer"
                    :editing-nonce="editingNonce"
                    @edit-start="handleEditStart"
                    @read="markAsRead"
                />

                <ChatEditor
                    :disabled="!!error"
                    :editing-nonce="editingNonce"
                    :editing-text="editingText"
                    @send="sendMessage"
                    @edit-submit="handleEditSubmit"
                    @edit-cancel="handleEditCancel"
                />
            </template>
        </template>
    </div>
</template>
