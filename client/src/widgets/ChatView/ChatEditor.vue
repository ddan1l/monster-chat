<script setup lang="ts">
import { ref, watch } from "vue";
import type { FileAttachment } from "shared";
import FileUploader from "@features/file-transfer/FileUploader.vue";

const props = defineProps<{
    disabled: boolean;
    chatId: string;
    editingNonce: string | null;
    editingText: string;
}>();

const emit = defineEmits<{
    send: [text: string, files?: FileAttachment[]];
    editSubmit: [nonce: string, newText: string];
    editCancel: [];
    typing: [];
    stopTyping: [];
}>();

const text = ref("");
const localEditText = ref("");
const attachments = ref<FileAttachment[]>([]);
const uploaderRef = ref<InstanceType<typeof FileUploader> | null>(null);

watch(
    () => props.editingText,
    (val) => {
        localEditText.value = val;
    },
    { immediate: true }
);

function send() {
    if (!text.value.trim() && !attachments.value.length) return;
    emit("stopTyping");
    emit(
        "send",
        text.value.trim(),
        attachments.value.length ? attachments.value : undefined
    );
    text.value = "";
    attachments.value = [];
    uploaderRef.value?.clear();
}

function submitEdit() {
    if (!props.editingNonce) return;
    const trimmed = localEditText.value.trim();
    if (trimmed && trimmed !== props.editingText) {
        emit("editSubmit", props.editingNonce, trimmed);
    } else {
        emit("editCancel");
    }
}
</script>

<template>
    <div style="padding: 20px 0">
        <template v-if="editingNonce">
            <div style="display: flex; gap: 8px; margin-top: 8px">
                <input
                    v-model="localEditText"
                    style="flex: 1"
                    @keydown.enter="submitEdit"
                    @keydown.esc="emit('editCancel')"
                />
                <button @click="submitEdit">Сохранить</button>
                <button @click="emit('editCancel')">Отмена</button>
            </div>
        </template>

        <template v-else>
            <FileUploader
                ref="uploaderRef"
                :chat-id="chatId"
                :disabled="disabled"
                @change="attachments = $event"
            />
            <div style="display: flex; gap: 8px; margin-top: 8px">
                <input
                    v-model="text"
                    placeholder="Сообщение"
                    style="flex: 1"
                    :disabled="disabled"
                    @keydown.enter="send"
                    @input="emit('typing')"
                />
                <button :disabled="disabled" @click="send">Отправить</button>
            </div>
        </template>
    </div>
</template>
