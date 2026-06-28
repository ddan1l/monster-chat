<script setup lang="ts">
import { ref, onMounted, computed } from "vue";

import { useRouter, useRoute } from "vue-router";

import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

import { useChats, chats } from "@entities/chat/useChats";
import {
    useChatMessages,
    lastMessageByChat,
} from "@entities/message/useMessages";
import { peers, usePeers } from "@entities/peer/usePeers";

import ChatKnockModal from "@widgets/ChatKnock/ChatKnockModal.vue";
import ChatListHeader from "@widgets/ChatList/ChatListHeader.vue";
import ChatListItem from "@widgets/ChatList/ChatListItem.vue";

import type { PeerInfo } from "shared";

declare const __APP_VERSION__: string;
const version = __APP_VERSION__;

const router = useRouter();
const route = useRoute();
const { loadChats } = useChats();
const { announceOnline } = usePeers();
const { read: readPeer } = useIndexedDb(STORES.PEERS);
const { getLastMessage } = useChatMessages();
const loaded = ref(false);

onMounted(async () => {
    await loadChats();

    const entries = await Promise.all(
        chats.value.map(async (c) => {
            const [peer, last] = await Promise.all([
                readPeer<PeerInfo>(c.id),
                getLastMessage(c.id),
            ]);
            return { id: c.id, peer, last };
        })
    );

    for (const { id, peer, last } of entries) {
        if (peer) peers.value[id] = peer;
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
            @select="router.push(`/chat/${chat.id}`)"
        />

        <div class="mc-chat-list__version">v{{ version }}</div>
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
