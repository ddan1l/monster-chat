<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { PeerInfo } from "shared";
import { useChats, chats } from "../../composables/chat/useChats";
import { useIndexedDb, STORES } from "../../composables/infrastructure/useIndexedDb";
import { useChatNotification } from "../../composables/chat/useChatNotification";

const router = useRouter();
const route = useRoute();
const { loadChats, createChat } = useChats();
const { unread } = useChatNotification();
const { read: readPeer } = useIndexedDb(STORES.PEERS);

const peers = ref<Record<string, PeerInfo>>({});

onMounted(async () => {
    await loadChats();
    const entries = await Promise.all(
        chats.value.map(async (c) => {
            const peer = await readPeer<PeerInfo>(c.id);
            return [c.id, peer] as const;
        })
    );
    for (const [id, peer] of entries) {
        if (peer) peers.value[id] = peer;
    }
});

async function handleCreateChat() {
    const chat = await createChat();
    router.push(`/chat/${chat.id}`);
}
</script>

<template>
    <div>
        <ul>
            <li
                v-for="chat in chats"
                :key="chat.id"
                style="cursor: pointer; margin-top: 15px"
                :class="{ active: route.params.chatId === chat.id }"
                @click="router.push(`/chat/${chat.id}`)"
            >
                <template v-if="peers[chat.id]">
                    {{ peers[chat.id].avatar }} {{ peers[chat.id].name }}
                </template>
                <template v-else>Новый чат</template>
                <span
                    v-if="unread[chat.id]"
                    style="
                        display: inline-block;
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: red;
                        margin-left: 6px;
                        vertical-align: middle;
                    "
                />
            </li>
        </ul>

        <button style="margin: 10px; margin-left: 30px" @click="handleCreateChat">
            New chat
        </button>
    </div>
</template>
