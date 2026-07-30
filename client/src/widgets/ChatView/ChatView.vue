<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import { useDebounce } from "@shared/lib/useDebounce";
import { useWs } from "@shared/transport/useWs";
import AppModal from "@shared/ui/components/AppModal.vue";

import {
    useChatNotification,
    unreadChatNotifications,
} from "@entities/chat/useChatNotification";
import { activeChatId, chats, useChats } from "@entities/chat/useChats";
import { useSettings, wallpaperCss } from "@entities/settings/useSettings";

import {
    useChatSession,
    type DecryptedMessage,
} from "@features/chat-session/model/useChatSession";
import SafetyNumbers from "@features/verify-identity/SafetyNumbers.vue";
import { useSafetyNumbers } from "@features/verify-identity/useSafetyNumbers";

import ChatEditor from "./ChatEditor.vue";
import ChatHeader from "./ChatHeader.vue";
import ChatKeyChangedNotice from "./ChatKeyChangedNotice.vue";
import ChatLeftedNotice from "./ChatLeftedNotice.vue";
import ChatMessages from "./ChatMessages.vue";
import ChatPinnedBar from "./ChatPinnedBar.vue";
import ChatSafetyNotice from "./ChatSafetyNotice.vue";

import type { FileAttachment } from "shared";

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
    hasMoreBelow,
    scrollTarget,
    pinned,
    connect,
    loadMoreMessages,
    loadMoreBelow,
    jumpToDate,
    jumpToLatest,
    jumpToMessage,
    messageDays,
    sendMessage,
    editMessage,
    markAsRead,
    sendTyping,
    sendStopTyping,
    deleteMessageForMe,
    deleteMessageForAll,
    togglePin,
    toggleReaction,
} = useChatSession(props.chatId);

const {
    safetyNumber,
    verified,
    keyChanged,
    load: loadSafety,
    markVerified,
    removeVerification,
} = useSafetyNumbers(props.chatId);

const { deleteChat, deleteChatForAll } = useChats();

// Обои чата из настроек — фон общего контейнера сообщений+редактора.
const { settings } = useSettings();
const bodyBackground = computed(() =>
    wallpaperCss(settings.value.chatWallpaper)
);

// Read-only состояние берём из реактивного стора, а не из локального chat —
// событие chat_deleted обновляет именно массив chats.
const isLefted = computed(
    () => chats.value.find((c) => c.id === props.chatId)?.lefted ?? false
);

// Есть непрочитанные в этом чате (для пульсации кнопки «вниз»).
const hasNewBelow = computed(
    () => (unreadChatNotifications.value[props.chatId] ?? 0) > 0
);

watch(
    peer,
    (p) => {
        if (p) {
            loadSafety(p);
        }
    },
    { immediate: true }
);

const { clearUnread } = useChatNotification();

const { schedule: debouncedClearUnread, cancel: cancelClearUnread } =
    useDebounce(() => clearUnread(props.chatId), 300);

onMounted(async () => {
    activeChatId.value = props.chatId;
    await clearUnread(props.chatId);
    await connect();
});

onUnmounted(() => {
    activeChatId.value = null;
    cancelClearUnread();
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

// Ответ/цитата.
const replyingTo = ref<DecryptedMessage | null>(null);
const replyPreview = computed(() => {
    const r = replyingTo.value;
    if (!r) {
        return null;
    }
    return {
        author: r.from === peer.value?.signPubKey ? peer.value?.name : "Вы",
        text: (r.text ?? "").replace(/<[^>]*>/g, "").trim() || "Вложение",
    };
});
function handleReply(msg: DecryptedMessage) {
    replyingTo.value = msg;
}
function handleSend(text: string, files?: FileAttachment[]) {
    const r = replyingTo.value;
    sendMessage(
        text,
        files,
        undefined,
        r
            ? {
                  nonce: r.nonce,
                  from: r.from,
                  text: r.text ?? "",
                  ts: r.timestamp,
              }
            : undefined
    );
    replyingTo.value = null;
}
</script>

<template>
    <div class="chat-view">
        <p v-if="error" class="chat-view__error">{{ error }}</p>

        <template v-if="chat?.established">
            <ChatHeader
                v-if="peer"
                :peer="peer"
                :is-online="isPeerOnline"
                :last-seen="peerLastSeen"
                :verified="verified"
                @open-safety="safetyPanelOpen = true"
                @delete-chat="deleteChat(props.chatId)"
                @delete-chat-for-all="deleteChatForAll(props.chatId)"
            />

            <AppModal
                v-if="peer"
                :is-visible="safetyPanelOpen"
                title="Секретные числа"
                @close="safetyPanelOpen = false"
            >
                <SafetyNumbers
                    :verified="verified"
                    :safety-number="safetyNumber"
                    :peer-name="peer.name"
                    @mark-verified="
                        markVerified();
                        safetyPanelOpen = false;
                    "
                    @remove-verification="
                        removeVerification();
                        safetyPanelOpen = false;
                    "
                />
            </AppModal>

            <ChatPinnedBar
                v-if="pinned.length"
                :pinned="pinned"
                @jump="jumpToMessage"
                @unpin="togglePin"
            />

            <div
                class="chat-view__body"
                :style="{ background: bodyBackground }"
            >
                <ChatMessages
                    :messages="messages"
                    :peer="peer"
                    :is-peer-typing="isPeerTyping"
                    :editing-nonce="editingNonce"
                    :has-more-below="hasMoreBelow"
                    :has-new-below="hasNewBelow"
                    :scroll-target="scrollTarget"
                    :on-load-more="loadMoreMessages"
                    :on-load-more-below="loadMoreBelow"
                    :on-jump-to-date="jumpToDate"
                    :on-jump-to-latest="jumpToLatest"
                    :on-scroll-handled="() => (scrollTarget = null)"
                    :message-days="messageDays"
                    @edit-start="handleEditStart"
                    @delete-for-me="deleteMessageForMe"
                    @delete-for-all="deleteMessageForAll"
                    @toggle-pin="togglePin"
                    @reaction="toggleReaction"
                    @reply="handleReply"
                    @jump-reply="
                        (nonce, ts) => jumpToMessage({ nonce, timestamp: ts })
                    "
                    @read="
                        (nonce: string) => {
                            markAsRead(nonce);
                            debouncedClearUnread();
                        }
                    "
                />

                <ChatKeyChangedNotice
                    v-if="keyChanged"
                    @open-safety="safetyPanelOpen = true"
                />

                <ChatSafetyNotice
                    v-if="verified === false"
                    @open-safety="safetyPanelOpen = true"
                />

                <ChatLeftedNotice v-if="isLefted" />

                <template v-else>
                    <ChatEditor
                        v-if="connected"
                        :disabled="!!error || verified !== true"
                        :chat-id="props.chatId"
                        :editing-nonce="editingNonce"
                        :editing-text="editingText"
                        :reply-preview="replyPreview"
                        @send="handleSend"
                        @edit-submit="handleEditSubmit"
                        @edit-cancel="handleEditCancel"
                        @cancel-reply="replyingTo = null"
                        @typing="sendTyping"
                        @stop-typing="sendStopTyping"
                    />
                    <div v-else class="chat-view__offline">Оффлайн режим</div>
                </template>
            </div>
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

    // Общий контейнер сообщений и редактора — чтобы редактор сливался с лентой
    // без шва. Фон (обои чата) задаётся инлайн из настроек (см. bodyBackground).
    &__body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    &__error {
        color: red;
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
