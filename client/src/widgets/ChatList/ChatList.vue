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
const activeChats = computed(() => chats.value.filter((c) => c.established));
</script>

<template>
    <div v-if="loaded" class="mc-chat-list">
        <ChatListHeader @new-chat="showNewChat = true" />

        <div v-if="activeChats.length" class="mc-chat-list__section">
            <span>ВСЕ ЧАТЫ</span>
            <span class="mc-chat-list__section-line" />
            <span>{{ activeChats.length }}</span>
        </div>

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
    </div>

    <ChatKnockModal v-if="showNewChat" @close="showNewChat = false" />
</template>

<style lang="scss" scoped>
.mc-chat-list {
    background-color: var(--mc-bg-list);
    border-right: 1px solid var(--mc-line-hard);
    display: flex;
    flex-direction: column;

    &__section {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px 8px;
        font-size: 0.625em;
        font-family: var(--mc-mono);
        font-weight: 700;
        color: var(--mc-fg-dim);
        letter-spacing: 0.06em;

        &-line {
            flex: 1;
            height: 1px;
            background: var(--mc-line-hard);
        }
    }
}
</style>
