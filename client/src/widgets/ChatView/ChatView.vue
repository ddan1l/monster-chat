<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useChatSession } from "@features/send-message/useChatSession";
import { useSafetyNumbers } from "@features/verify-identity/useSafetyNumbers";
import { activeChatId, useChats } from "@entities/chat/useChats";
import { useChatNotification } from "@entities/chat/useChatNotification";
import ChatHeader from "./ChatHeader.vue";
import SafetyNumbers from "@features/verify-identity/SafetyNumbers.vue";
import ChatMessages from "./ChatMessages.vue";
import ChatEditor from "./ChatEditor.vue";

const props = defineProps<{ chatId: string }>();

const editingNonce = ref<string | null>(null);
const editingText = ref("");
const safetyPanelOpen = ref(false);

const {
    error,
    messages,
    chat,
    peer,
    isPeerOnline,
    peerLastSeen,
    isPeerTyping,
    connect,
    sendMessage,
    editMessage,
    markAsRead,
    sendTyping,
    sendStopTyping,
    deleteMessageForMe,
    deleteMessageForAll,
    deleteChatForAll: sendDeleteChatForAll,
} = useChatSession(props.chatId, () => deleteChatForMe(props.chatId));

const {
    safetyNumber,
    verified,
    keyChanged,
    load: loadSafety,
    markVerified,
    removeVerification,
} = useSafetyNumbers(props.chatId);

const { deleteChatForMe, deleteChatForAll: cleanupAndDeleteChatForAll } =
    useChats();

watch(
    peer,
    (p) => {
        if (p) loadSafety(p);
    },
    { immediate: true }
);

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
    <div
        style="
            display: flex;
            flex-direction: column;
            min-height: 0;
            height: 100%;
        "
    >
        <p v-if="error" style="color: red">{{ error }}</p>

        <template v-if="chat?.isActive">
            <ChatHeader
                v-if="peer"
                :peer="peer"
                :is-online="isPeerOnline"
                :last-seen="peerLastSeen"
                :verified="verified"
                :key-changed="keyChanged"
                @open-panel="safetyPanelOpen = true"
                @delete-chat-for-me="deleteChatForMe(props.chatId)"
                @delete-chat-for-all="
                    sendDeleteChatForAll();
                    cleanupAndDeleteChatForAll(props.chatId);
                "
            />

            <SafetyNumbers
                v-if="safetyPanelOpen && peer"
                :verified="verified"
                :safety-number="safetyNumber"
                :peer-name="peer.name"
                @mark-verified="
                    markVerified();
                    safetyPanelOpen = false;
                "
                @remove-verification="removeVerification"
                @close="safetyPanelOpen = false"
            />

            <ChatMessages
                :messages="messages"
                :peer="peer"
                :is-peer-typing="isPeerTyping"
                :editing-nonce="editingNonce"
                @edit-start="handleEditStart"
                @delete-for-me="deleteMessageForMe"
                @delete-for-all="deleteMessageForAll"
                @read="markAsRead"
            />

            <div
                v-if="verified === false"
                style="
                    padding: 10px 0 4px;
                    font-size: 13px;
                    color: #888;
                    text-align: center;
                "
            >
                Верифицируйте секретные числа, прежде чем писать сообщения —
                <button
                    style="
                        background: none;
                        border: none;
                        color: #a78bfa;
                        cursor: pointer;
                        padding: 0;
                        font-size: 13px;
                        text-decoration: underline;
                    "
                    @click="safetyPanelOpen = true"
                >
                    Верифицировать
                </button>
            </div>

            <ChatEditor
                :disabled="!!error || verified !== true"
                :chat-id="props.chatId"
                :editing-nonce="editingNonce"
                :editing-text="editingText"
                @send="sendMessage"
                @edit-submit="handleEditSubmit"
                @edit-cancel="handleEditCancel"
                @typing="sendTyping"
                @stop-typing="sendStopTyping"
            />
        </template>
    </div>
</template>
