<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";

import type { DecryptedMessage } from "@features/send-message/useChatSession";

import ChatMessage from "./ChatMessage.vue";

import type { PeerInfo } from "shared";

const props = defineProps<{
    messages: DecryptedMessage[];
    peer: PeerInfo | null;
    editingNonce: string | null;
    isPeerTyping: boolean;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
    deleteForMe: [nonce: string];
    deleteForAll: [nonce: string];
    read: [nonce: string];
}>();

const listEl = ref<HTMLElement | null>(null);
const observedNonces = new Set<string>();
let observer: IntersectionObserver | null = null;
let initialScrollDone = false;

function scrollToBottom(smooth = false) {
    if (!listEl.value) return;
    if (smooth) {
        listEl.value.scrollTo({
            top: listEl.value.scrollHeight,
        });
    } else {
        listEl.value.scrollTop = listEl.value.scrollHeight;
    }
}

function isNearBottom() {
    if (!listEl.value) return true;
    const { scrollTop, scrollHeight, clientHeight } = listEl.value;
    return scrollHeight - scrollTop - clientHeight < 100;
}

function observePendingMessages() {
    if (!observer || !props.peer || !listEl.value) return;
    for (const msg of props.messages) {
        if (
            msg.from !== props.peer.signPubKey ||
            msg.isRead ||
            observedNonces.has(msg.nonce)
        )
            continue;
        const el = listEl.value.querySelector<HTMLElement>(
            `[data-nonce="${msg.nonce}"]`
        );
        if (el) {
            observedNonces.add(msg.nonce);
            observer.observe(el);
        }
    }
}

onMounted(() => {
    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const nonce = (entry.target as HTMLElement).dataset.nonce!;
            observer!.unobserve(entry.target);
            emit("read", nonce);
        }
    });
});

onUnmounted(() => observer?.disconnect());

watch(
    () => props.messages.length,
    async (newLen, oldLen) => {
        await nextTick();
        observePendingMessages();
        if (!initialScrollDone && newLen > 0) {
            initialScrollDone = true;
            requestAnimationFrame(() => scrollToBottom());
        } else if (newLen > (oldLen ?? 0) && isNearBottom()) {
            scrollToBottom(true);
        }
    }
);

watch(
    () => props.peer,
    async () => {
        await nextTick();
        observePendingMessages();
    }
);

watch(
    () => props.isPeerTyping,
    async (val) => {
        if (val && isNearBottom()) {
            await nextTick();
            scrollToBottom(true);
        }
    }
);
</script>

<template>
    <ul
        ref="listEl"
        style="
            list-style: none;
            padding: 0;
            margin: 0;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
        "
    >
        <ChatMessage
            v-for="msg in messages"
            :key="msg.nonce"
            :msg="msg"
            :peer="peer"
            :editing-nonce="editingNonce"
            @edit-start="(nonce, text) => emit('editStart', nonce, text)"
            @delete-for-me="(nonce) => emit('deleteForMe', nonce)"
            @delete-for-all="(nonce) => emit('deleteForAll', nonce)"
        />

        <li
            v-if="isPeerTyping"
            style="display: flex; align-items: flex-start; margin-bottom: 8px"
        >
            <div
                style="
                    background: #f0f0f0;
                    padding: 8px 12px;
                    border-radius: 12px;
                    font-size: 13px;
                    color: #888;
                    font-style: italic;
                "
            >
                {{ peer?.name }} печатает…
            </div>
        </li>
    </ul>
</template>
