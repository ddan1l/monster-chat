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
    async () => {
        await nextTick();
        observePendingMessages();
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
