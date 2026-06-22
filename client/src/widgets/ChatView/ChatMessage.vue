<script setup lang="ts">
import { ref } from "vue";

import { useFileDownload } from "@features/file-transfer/useFileDownload";
import type { DecryptedMessage } from "@features/send-message/useChatSession";

import type { PeerInfo } from "shared";

const { downloadFile } = useFileDownload();

const props = defineProps<{
    msg: DecryptedMessage;
    peer: PeerInfo | null;
    editingNonce: string | null;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
    deleteForMe: [nonce: string];
    deleteForAll: [nonce: string];
}>();

const isMine = () => props.msg.from !== props.peer?.signPubKey;

const menuX = ref(0);
const menuY = ref(0);
const showMenu = ref(false);

function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    menuX.value = e.clientX;
    menuY.value = e.clientY;
    showMenu.value = true;
}

function closeMenu() {
    showMenu.value = false;
}
</script>

<template>
    <!-- Context menu overlay -->
    <teleport to="body">
        <div
            v-if="showMenu"
            style="position: fixed; inset: 0; z-index: 99"
            @click="closeMenu"
            @contextmenu.prevent="closeMenu"
        />
        <div
            v-if="showMenu"
            :style="{
                position: 'fixed',
                left: menuX + 'px',
                top: menuY + 'px',
                zIndex: 100,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '4px',
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
            }"
        >
            <button
                v-if="isMine()"
                style="
                    background: none;
                    border: none;
                    color: #ccc;
                    cursor: pointer;
                    padding: 7px 12px;
                    text-align: left;
                    font-size: 13px;
                    border-radius: 4px;
                "
                :disabled="editingNonce !== null"
                @click="
                    emit('editStart', msg.nonce, msg.text ?? '');
                    closeMenu();
                "
            >
                ✏️ Редактировать
            </button>
            <button
                style="
                    background: none;
                    border: none;
                    color: #ccc;
                    cursor: pointer;
                    padding: 7px 12px;
                    text-align: left;
                    font-size: 13px;
                    border-radius: 4px;
                "
                @click="
                    emit('deleteForMe', msg.nonce);
                    closeMenu();
                "
            >
                🗑️ Удалить у меня
            </button>
            <button
                v-if="isMine()"
                style="
                    background: none;
                    border: none;
                    color: #f87171;
                    cursor: pointer;
                    padding: 7px 12px;
                    text-align: left;
                    font-size: 13px;
                    border-radius: 4px;
                "
                @click="
                    emit('deleteForAll', msg.nonce);
                    closeMenu();
                "
            >
                🗑️ Удалить у всех
            </button>
        </div>
    </teleport>

    <div
        :id="msg.nonce"
        class="mc-message-wrapper"
        :data-nonce="msg.nonce"
        :style="{
            justifyContent: isMine() ? 'flex-end' : 'flex-start',
        }"
        @contextmenu="onContextMenu"
    >
        <div class="mc-message">
            <div style="display: flex; flex-direction: column; gap: 6px">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-html="msg.text"></span>
                <div
                    v-for="(file, i) in msg.files"
                    :key="i"
                    style="
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: #222;
                        border-radius: 6px;
                        padding: 6px 10px;
                        font-size: 12px;
                        cursor: pointer;
                    "
                    @click="downloadFile(file)"
                >
                    <span>📎</span>
                    <span style="color: #ccc">{{ file.name }}</span>
                    <span style="color: #666"
                        >{{ (file.size / 1024).toFixed(0) }} KB</span
                    >
                </div>
            </div>
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
            <span v-if="isMine()">{{ msg.isRead ? "✓✓" : "✓" }}</span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-message-wrapper {
    display: flex;
    padding: 8px 22px;
}
.mc-message {
    background: var(--mc-bg-bubble-in);
    border: 1px solid var(--mc-line);
    color: var(--fg);
    padding: 9px 13px 7px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    max-width: 100%;
    word-wrap: break-word;
    position: relative;
}
</style>
