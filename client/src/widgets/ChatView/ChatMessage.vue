<script setup lang="ts">
import { ref } from "vue";
import type { PeerInfo } from "shared";
import type { DecryptedMessage } from "@features/send-message/useChatSession";
import { useFileDownload } from "@features/file-transfer/useFileDownload";

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
                style="background: none; border: none; color: #ccc; cursor: pointer; padding: 7px 12px; text-align: left; font-size: 13px; border-radius: 4px"
                :disabled="editingNonce !== null"
                @click="emit('editStart', msg.nonce, msg.text ?? ''); closeMenu()"
            >✏️ Редактировать</button>
            <button
                style="background: none; border: none; color: #ccc; cursor: pointer; padding: 7px 12px; text-align: left; font-size: 13px; border-radius: 4px"
                @click="emit('deleteForMe', msg.nonce); closeMenu()"
            >🗑️ Удалить у меня</button>
            <button
                v-if="isMine()"
                style="background: none; border: none; color: #f87171; cursor: pointer; padding: 7px 12px; text-align: left; font-size: 13px; border-radius: 4px"
                @click="emit('deleteForAll', msg.nonce); closeMenu()"
            >🗑️ Удалить у всех</button>
        </div>
    </teleport>

    <li
        :id="msg.nonce"
        :data-nonce="msg.nonce"
        :style="{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMine() ? 'flex-end' : 'flex-start',
            marginBottom: '8px',
            opacity: editingNonce === msg.nonce ? 0.6 : 1,
        }"
        @contextmenu="onContextMenu"
    >
        <div style="
            display: inline-flex;
            align-items: baseline;
            gap: 6px;
            background: #f0f0f0;
            padding: 6px 10px;
            border-radius: 12px;
            max-width: 70%;
        ">
            <div style="display: flex; flex-direction: column; gap: 6px">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-html="msg.text"></span>
                <div
                    v-for="(file, i) in msg.files" :key="i"
                    style="display: flex; align-items: center; gap: 8px; background: #222; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer"
                    @click="downloadFile(file)"
                >
                    <span>📎</span>
                    <span style="color: #ccc">{{ file.name }}</span>
                    <span style="color: #666">{{ (file.size / 1024).toFixed(0) }} KB</span>
                </div>
            </div>
            <span v-if="msg.editedAt" style="font-size: 11px; color: #888">изм.</span>
        </div>

        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 12px; color: #888">
            <span v-if="isMine()">{{ msg.isRead ? "✓✓" : "✓" }}</span>
        </div>
    </li>
</template>
