<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

import { useRouter, useRoute } from "vue-router";

import { useChats, chats } from "@entities/chat/useChats";
import {
    useChatMessages,
    lastMessageByChat,
} from "@entities/message/useMessages";
import { usePeers } from "@entities/peer/usePeers";

import ChatKnockModal from "@widgets/ChatKnock/ChatKnockModal.vue";
import ChatListHeader from "@widgets/ChatList/ChatListHeader.vue";
import ChatListItem from "@widgets/ChatList/ChatListItem.vue";

declare const __APP_VERSION__: string;
const version = __APP_VERSION__;

const router = useRouter();
const route = useRoute();
const { loadChats } = useChats();
const { announceOnline } = usePeers();
const { getLastMessage } = useChatMessages();
const loaded = ref(false);

onMounted(async () => {
    await loadChats();

    const entries = await Promise.all(
        chats.value.map(async (c) => {
            const last = await getLastMessage(c.id);
            return { id: c.id, last };
        })
    );

    for (const { id, last } of entries) {
        if (last) lastMessageByChat.value[id] = last;
    }

    announceOnline();
    loaded.value = true;
});

const showNewChat = ref(false);
const activeChats = computed(() => chats.value.filter((c) => c.isActive));
</script>

<template>
    <div v-if="loaded" class="mc-chat-list">
        <ChatListHeader @new-chat="showNewChat = true" />

        <ChatListItem
            v-for="chat in activeChats"
            :key="chat.id"
            :chat="chat"
            :is-active="route.params.chatId === chat.id"
            @select="
                route.params.chatId === chat.id
                    ? router.push('/app')
                    : router.push(`/app/chat/${chat.id}`)
            "
        />

        <div class="mc-chat-list__version">VERSION({{ version }})</div>
    </div>

    <ChatKnockModal v-if="showNewChat" @close="showNewChat = false" />
</template>

<style lang="scss" scoped>
.mc-chat-list {
    background-color: var(--mc-bg-list);
    border-right: 1px solid var(--mc-line-hard);
    display: flex;
    flex-direction: column;

    &__version {
        margin-top: auto;
        padding: 8px 16px;
        font-size: 0.6875em;
        font-family: var(--mc-mono);
        color: var(--mc-fg-dim);
        border-top: 1px solid var(--mc-line-hard);
    }
}
</style>
