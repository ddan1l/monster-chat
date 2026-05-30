<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useChatSession } from "../../composables/chat/useChatSession";
import { useSafetyNumbers } from "../../composables/crypto/useSafetyNumbers";
import { activeChatId } from "../../composables/chat/useChats";
import { useChatNotification } from "../../composables/chat/useChatNotification";
import ChatPending from "./ChatPending.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatSafetyNumbers from "./ui/ChatSafetyNumbers.vue";
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
    connect,
    sendMessage,
    editMessage,
    markAsRead,
} = useChatSession(props.chatId);

const { safetyNumber, verified, keyChanged, load: loadSafety, markVerified, removeVerification } =
    useSafetyNumbers(props.chatId);

watch(peer, (p) => { if (p) loadSafety(p); }, { immediate: true });

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

        <template v-if="chat">
            <ChatPending v-if="!chat.isActive" :chat="chat" />

            <template v-else-if="chat.isActive">
                <ChatHeader
                    v-if="peer"
                    :peer="peer"
                    :is-online="isPeerOnline"
                    :last-seen="peerLastSeen"
                    :verified="verified"
                    :key-changed="keyChanged"
                    @open-panel="safetyPanelOpen = true"
                />

                <ChatSafetyNumbers
                    v-if="safetyPanelOpen && peer"
                    :verified="verified"
                    :safety-number="safetyNumber"
                    :peer-name="peer.name"
                    @mark-verified="markVerified(); safetyPanelOpen = false"
                    @remove-verification="removeVerification"
                    @close="safetyPanelOpen = false"
                />

                <ChatMessages
                    :messages="messages"
                    :peer="peer"
                    :editing-nonce="editingNonce"
                    @edit-start="handleEditStart"
                    @read="markAsRead"
                />

                <div v-if="!verified" style="
                    padding: 10px 0 4px;
                    font-size: 13px;
                    color: #888;
                    text-align: center;
                ">
                    Верифицируйте секретные числа, прежде чем писать сообщения —
                    <button
                        style="background: none; border: none; color: #a78bfa; cursor: pointer; padding: 0; font-size: 13px; text-decoration: underline"
                        @click="safetyPanelOpen = true"
                    >Верифицировать</button>
                </div>

                <ChatEditor
                    :disabled="!!error || !verified"
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
