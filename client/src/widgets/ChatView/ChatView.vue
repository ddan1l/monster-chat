<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";

import { useWs } from "@shared/api/useWs";

import { useChatNotification } from "@entities/chat/useChatNotification";
import { activeChatId, useChats } from "@entities/chat/useChats";

import { useChatSession } from "@features/send-message/useChatSession";
import SafetyNumbers from "@features/verify-identity/SafetyNumbers.vue";
import { useSafetyNumbers } from "@features/verify-identity/useSafetyNumbers";

import ChatEditor from "./ChatEditor.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatMessages from "./ChatMessages.vue";

const props = defineProps<{ chatId: string }>();

const editingNonce = ref<string | null>(null);
const editingText = ref("");
const safetyPanelOpen = ref(false);

const { connected } = useWs();

const {
    error,
    messages,
    chat,
    peer,
    isPeerOnline,
    peerLastSeen,
    isPeerTyping,
    connect,
    loadMoreMessages,
    sendMessage,
    editMessage,
    markAsRead,
    sendTyping,
    sendStopTyping,
    deleteMessageForMe,
    deleteMessageForAll,
} = useChatSession(props.chatId);

const {
    safetyNumber,
    verified,
    keyChanged,
    load: loadSafety,
    markVerified,
    removeVerification,
} = useSafetyNumbers(props.chatId);

const { deleteChat } = useChats();

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
    await clearUnread(props.chatId);
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
    <div class="chat-view">
        <p v-if="error" class="chat-view__error">{{ error }}</p>

        <template v-if="chat?.isActive">
            <ChatHeader
                v-if="peer"
                :peer="peer"
                :is-online="isPeerOnline"
                :last-seen="peerLastSeen"
                :verified="verified"
                :key-changed="keyChanged"
                @open-panel="safetyPanelOpen = true"
                @delete-chat="deleteChat(props.chatId)"
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
                :on-load-more="loadMoreMessages"
                @edit-start="handleEditStart"
                @delete-for-me="deleteMessageForMe"
                @delete-for-all="deleteMessageForAll"
                @read="markAsRead"
            />

            <div v-if="verified === false" class="chat-view__verify-hint">
                Верифицируйте секретные числа, прежде чем писать сообщения —
                <button
                    class="chat-view__verify-link"
                    @click="safetyPanelOpen = true"
                >
                    Верифицировать
                </button>
            </div>

            <ChatEditor
                v-if="connected"
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
            <div v-else class="chat-view__offline">Оффлайн режим</div>
        </template>
    </div>
</template>

<style scoped lang="scss">
.chat-view {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    overflow: hidden;

    &__error {
        color: red;
    }

    &__verify-hint {
        padding: 10px 0 4px;
        font-size: 13px;
        color: #888;
        text-align: center;
    }

    &__verify-link {
        background: none;
        border: none;
        color: #a78bfa;
        cursor: pointer;
        padding: 0;
        font-size: 13px;
        text-decoration: underline;
    }

    &__offline {
        padding: 12px 16px;
        font-size: 13px;
        color: var(--mc-fg-dim);
        text-align: center;
        border-top: 1px solid var(--mc-line-hard);
    }
}
</style>
