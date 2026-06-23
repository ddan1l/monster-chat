<script setup lang="ts">
import { ref, watch } from "vue";

import AppEditor from "@shared/ui/components/AppEditor.vue";

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
            <!-- <FileUploader
                ref="uploaderRef"
                :chat-id="chatId"
                :disabled="disabled"
                @change="attachments = $event"
            /> -->
            <div class="chat-editor__row">
                <AppEditor
                    ref="editorRef"
                    v-model="sendText"
                    :autofocus="true"
                    @input="emit('typing')"
                    @submit="send"
                />
                <button
                    class="chat-editor__btn chat-editor__btn_primary"
                    :disabled="disabled"
                    @click="send"
                >
                    Отправить
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
    &__row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        background: var(--mc-bg-input, var(--mc-bg-rail));
        border: 1px solid var(--mc-line);
        padding: 8px 12px;
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

        &_primary {
            color: var(--mc-acid);
            border-color: var(--mc-acid);
            &:hover {
                background: var(--mc-acid);
                color: var(--mc-fd-dark);
            }
            &:disabled {
                opacity: 0.4;
                pointer-events: none;
            }
        }
    }
}
</style>
