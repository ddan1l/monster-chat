<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";

import { useRouter, useRoute } from "vue-router";

import { useWs } from "@shared/api/useWs";
import { useDate } from "@shared/lib/useDate";
import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";
import IconPlus from "@shared/ui/icons/IconPlus.vue";

import { useChatNotification } from "@entities/chat/useChatNotification";
import { useChats, chats, activeChatId } from "@entities/chat/useChats";
import {
    useChatMessages,
    lastMessageByChat,
} from "@entities/message/useMessages";

import ChatKnockModal from "@widgets/ChatKnock/ChatKnockModal.vue";

import type { PeerInfo } from "shared";

const router = useRouter();
const route = useRoute();
const { loadChats } = useChats();
const { unread } = useChatNotification();
const { read: readPeer } = useIndexedDb(STORES.PEERS);
const { getLastMessage } = useChatMessages();
const { subscribe } = useWs();
const { formatMessageTime } = useDate();
const peers = ref<Record<string, PeerInfo>>({});
const onlineStatus = ref<Record<string, boolean>>({});
const typingStatus = ref<Record<string, boolean>>({});
const loaded = ref(false);

const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const unsubs: (() => void)[] = [];

function previewText(chatId: string): string {
    const msg = lastMessageByChat.value[chatId];
    if (!msg) return "";
    const m = msg as {
        action?: string;
        files?: { name: string }[];
        text?: string;
    };
    if (m.action) return "";
    if (m.files?.length) return `📎 ${m.files[0].name}`;
    return m.text ?? "";
}

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

    loaded.value = true;

    unsubs.push(
        subscribe("peer_online", (msg) => {
            onlineStatus.value[msg.payload.chatId] = true;
        })
    );

    unsubs.push(
        subscribe("peer_offline", (msg) => {
            onlineStatus.value[msg.payload.chatId] = false;
        })
    );

    unsubs.push(
        subscribe("peer_typing", (msg) => {
            const { chatId } = msg.payload;
            if (activeChatId.value === chatId) return;
            typingStatus.value[chatId] = true;
            clearTimeout(typingTimers[chatId]);
            typingTimers[chatId] = setTimeout(() => {
                typingStatus.value[chatId] = false;
            }, 3000);
        })
    );

    unsubs.push(
        subscribe("peer_stop_typing", (msg) => {
            const { chatId } = msg.payload;
            typingStatus.value[chatId] = false;
            clearTimeout(typingTimers[chatId]);
        })
    );
});

onUnmounted(() => {
    unsubs.forEach((fn) => fn());
    Object.values(typingTimers).forEach(clearTimeout);
});

const showNewChat = ref(false);
const activeChats = computed(() => chats.value.filter((c) => c.isActive));
</script>

<template>
    <div v-if="loaded" class="mc-chat-list">
        <div class="mc-chat-list-header">
            <h2>ЧАТЫ<span class="color-accent">/</span></h2>

            <button class="button-sm" @click="showNewChat = true">
                <IconPlus />
            </button>
        </div>

        <ul style="list-style: none; padding: 0; margin: 0">
            <li
                v-for="chat in activeChats"
                :key="chat.id"
                :style="{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    background:
                        route.params.chatId === chat.id
                            ? 'rgb(192, 208, 227)'
                            : 'none',
                }"
                @click="router.push(`/chat/${chat.id}`)"
            >
                <!-- Avatar -->
                <div style="position: relative; flex-shrink: 0">
                    <span style="font-size: 28px">
                        {{ peers[chat.id]?.avatar ?? "💬" }}
                    </span>
                    <span
                        v-if="onlineStatus[chat.id]"
                        :style="{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: onlineStatus[chat.id]
                                ? '#22c55e'
                                : '#555',
                            border: '2px solid #0d0d0d',
                        }"
                    />
                </div>

                <!-- Content -->
                <div style="flex: 1; min-width: 0">
                    <div
                        style="
                            display: flex;
                            justify-content: space-between;
                            align-items: baseline;
                        "
                    >
                        <span style="font-weight: 600; font-size: 14px">
                            {{ peers[chat.id]?.name ?? "Новый чат" }}
                        </span>
                        <span
                            v-if="lastMessageByChat[chat.id]"
                            style="
                                font-size: 11px;
                                color: #555;
                                flex-shrink: 0;
                                margin-left: 6px;
                            "
                        >
                            {{
                                formatMessageTime(
                                    lastMessageByChat[chat.id].timestamp
                                )
                            }}
                        </span>
                    </div>

                    <div
                        style="
                            display: flex;
                            align-items: center;
                            gap: 6px;
                            margin-top: 2px;
                        "
                    >
                        <span
                            v-if="typingStatus[chat.id]"
                            style="
                                font-size: 12px;
                                color: #888;
                                font-style: italic;
                                flex: 1;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            "
                            >печатает…</span
                        >
                        <span
                            v-else-if="previewText(chat.id)"
                            style="
                                font-size: 12px;
                                color: #666;
                                flex: 1;
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                            "
                            >{{ previewText(chat.id) }}</span
                        >
                        <span
                            v-else
                            style="font-size: 12px; color: #444; flex: 1"
                        >
                            {{ chat.isActive ? "" : "Ожидает подтверждения" }}
                        </span>

                        <span
                            v-if="unread[chat.id]"
                            style="
                                flex-shrink: 0;
                                background: #7c3aed;
                                color: white;
                                border-radius: 10px;
                                padding: 1px 6px;
                                font-size: 11px;
                                font-weight: 600;
                            "
                            >{{ unread[chat.id] }}</span
                        >
                    </div>
                </div>
            </li>
        </ul>
    </div>

    <ChatKnockModal v-if="showNewChat" @close="showNewChat = false" />
</template>

<style lang="scss" scoped>
.mc-chat-list {
    background-color: var(--mc-bg-list);
    border-right: 1px solid var(--mc-line-hard);
}
.mc-chat-list-header {
    padding: 20px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
</style>
