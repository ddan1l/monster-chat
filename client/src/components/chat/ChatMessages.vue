<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import type { PeerInfo } from "shared";
import type { DecryptedMessage } from "../../composables/chat/useChatSession";
import ChatMessage from "./ChatMessage.vue";

const props = defineProps<{
    messages: DecryptedMessage[];
    peer: PeerInfo | null;
    editingNonce: string | null;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
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
</script>

<template>
    <ul
        ref="listEl"
        style="
            list-style: none;
            padding: 0;
            margin: 0;
            flex: 1;
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
        />
    </ul>
</template>
