<script setup lang="ts">
import type { PeerInfo } from "shared";
import type { DecryptedMessage } from "../../composables/chat/useChatSession";

const props = defineProps<{
    msg: DecryptedMessage;
    peer: PeerInfo | null;
    editingNonce: string | null;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
}>();

const isMine = () => props.msg.from !== props.peer?.signPubKey;
</script>

<template>
    <li
        :data-nonce="msg.nonce"
        :style="{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMine() ? 'flex-end' : 'flex-start',
            marginBottom: '8px',
            opacity: editingNonce === msg.nonce ? 0.6 : 1,
        }"
    >
        <div
            style="
                display: inline-flex;
                align-items: baseline;
                gap: 6px;
                background: #f0f0f0;
                padding: 6px 10px;
                border-radius: 12px;
                max-width: 70%;
            "
        >
            <span>{{ msg.text }}</span>
            <span v-if="msg.editedAt" style="font-size: 11px; color: #888"
                >изм.</span
            >
        </div>
        <div
            style="
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 2px;
                font-size: 12px;
                color: #888;
            "
        >
            <button
                v-if="isMine()"
                style="font-size: 11px; padding: 0 4px"
                :disabled="editingNonce !== null"
                @click="emit('editStart', msg.nonce, msg.text)"
            >
                ✏️
            </button>
            <span v-if="isMine()">{{ msg.isRead ? "✓✓" : "✓" }}</span>
        </div>
    </li>
</template>
