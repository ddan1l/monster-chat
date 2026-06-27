<script setup lang="ts">
import { ref } from "vue";

import type { DecryptedMessage } from "@features/send-message/useChatSession";

import ChatDateDivider from "./ChatDateDivider.vue";
import ChatMessage from "./ChatMessage.vue";
import ChatTypingIndicator from "./ChatTypingIndicator.vue";
import { useChatItems } from "./useChatItems";
import { useChatScroll } from "./useChatScroll";

import type { PeerInfo } from "shared";

const props = defineProps<{
    messages: DecryptedMessage[];
    peer: PeerInfo | null;
    editingNonce: string | null;
    isPeerTyping: boolean;
    onLoadMore: () => Promise<void>;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
    deleteForMe: [nonce: string];
    deleteForAll: [nonce: string];
    read: [nonce: string];
}>();

const listEl = ref<HTMLElement | null>(null);

const { items } = useChatItems(() => props.messages);

useChatScroll(
    listEl,
    () => props.messages,
    () => props.peer,
    () => props.isPeerTyping,
    (nonce) => emit("read", nonce),
    props.onLoadMore
);
</script>

<template>
    <div ref="listEl" class="mc-chat-messages">
        <template
            v-for="item in items"
            :key="item.type === 'divider' ? item.key : item.msg.nonce"
        >
            <ChatDateDivider
                v-if="item.type === 'divider'"
                :timestamp="item.ts"
                :data-date="item.key"
            />
            <ChatMessage
                v-else
                :msg="item.msg"
                :peer="peer"
                :tail="
                    messages[item.index + 1]
                        ? messages[item.index + 1].from !== item.msg.from
                        : !(isPeerTyping && item.msg.from === peer?.signPubKey)
                "
                :continued="
                    item.index > 0 &&
                    messages[item.index - 1]?.from === item.msg.from
                "
                :editing-nonce="editingNonce"
                @edit-start="(nonce, text) => emit('editStart', nonce, text)"
                @delete-for-me="(nonce) => emit('deleteForMe', nonce)"
                @delete-for-all="(nonce) => emit('deleteForAll', nonce)"
            />
        </template>

        <ChatTypingIndicator v-if="isPeerTyping" :peer="peer" />
    </div>
</template>

<style lang="scss" scoped>
.mc-chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-anchor: none;
    padding: 0;
    margin: 0;
    background:
        radial-gradient(
            60% 40% at 100% 0%,
            var(--mc-acid-subtle),
            transparent 55%
        ),
        var(--mc-bg-chat);
}
</style>
