<script setup lang="ts">
import { ref, watch } from "vue";

import AppEditor from "@shared/ui/components/AppEditor.vue";
import IconSend from "@shared/ui/icons/IconSend.vue";

import FileAudioRecording from "@features/file-transfer/FileAudioRecording.vue";
import FileUploader from "@features/file-transfer/FileUploader.vue";

import type { FileAttachment } from "shared";

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

const attachments = ref<FileAttachment[]>([]);
const uploaderRef = ref<InstanceType<typeof FileUploader> | null>(null);
const editorRef = ref<InstanceType<typeof AppEditor> | null>(null);
const editEditorRef = ref<InstanceType<typeof AppEditor> | null>(null);

const sendText = ref("");
const editText = ref("");

watch(
    () => props.editingText,
    (val) => {
        editText.value = val;
        editEditorRef.value?.setContent(val);
    },
    { immediate: true }
);

function send() {
    const html = sendText.value;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    if (!stripped && !attachments.value.length) return;
    emit("stopTyping");
    emit(
        "send",
        html,
        attachments.value.length ? attachments.value : undefined
    );
    sendText.value = "";
    editorRef.value?.clear();
    attachments.value = [];
    uploaderRef.value?.clear();
}

function submitEdit() {
    if (!props.editingNonce) return;
    const html = editText.value;
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    if (stripped && html !== props.editingText) {
        emit("editSubmit", props.editingNonce, html);
    } else {
        emit("editCancel");
    }
}
</script>

<template>
    <div class="chat-editor">
        <template v-if="editingNonce">
            <div class="chat-editor__row">
                <AppEditor
                    ref="editEditorRef"
                    v-model="editText"
                    placeholder="Редактировать…"
                    autofocus
                    @submit="submitEdit"
                />
                <button class="chat-editor__btn" @click="submitEdit">
                    Сохранить
                </button>
                <button class="chat-editor__btn" @click="emit('editCancel')">
                    Отмена
                </button>
            </div>
        </template>

        <template v-else>
            <div class="chat-editor__wrap">
                <div class="chat-editor__row">
                    <FileUploader
                        ref="uploaderRef"
                        :chat-id="chatId"
                        :disabled="disabled"
                        @change="attachments = $event"
                    />

                    <AppEditor
                        ref="editorRef"
                        v-model="sendText"
                        :autofocus="true"
                        @input="emit('typing')"
                        @submit="send"
                    />
                    <FileAudioRecording :disabled="disabled" />
                </div>
                <button
                    class="chat-editor__send"
                    :disabled="disabled"
                    @click="send"
                >
                    <IconSend />
                </button>
            </div>
        </template>
    </div>
</template>

<style lang="scss" scoped>
.chat-editor {
    padding: 14px 18px 14px;
    background-color: var(--mc-bg-rail);
    border-top: 1px solid var(--mc-line);
    margin-top: 10px;
    &__wrap {
        display: flex;
        align-items: flex-end;
        gap: 8px;
    }

    &__row {
        flex: 1;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: var(--mc-bg-input, var(--mc-bg-rail));
        border: 1px solid var(--mc-line);
        padding: 4px;
    }

    &__btn {
        flex-shrink: 0;
        padding: 4px 12px;
        font-size: 13px;
        color: var(--mc-fg-mute);
        border: 1px solid var(--mc-line);
        transition: 0.1s;
        white-space: nowrap;

        &:hover {
            color: var(--mc-fg);
            background: var(--mc-bg-sel);
        }
    }

    &__send {
        flex-shrink: 0;
        width: 44px;
        height: 44px;
        background: var(--mc-acid);
        color: #0a0c0a;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 0 20px var(--mc-acid-glow);
        border: none;
        transition:
            box-shadow 0.15s,
            opacity 0.1s;

        &:hover {
            box-shadow: 0 0 32px var(--mc-acid-glow-strong);
        }

        &:disabled {
            opacity: 0.4;
            pointer-events: none;
        }
    }
}
</style>
