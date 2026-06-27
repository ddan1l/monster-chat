<script setup lang="ts">
import { ref } from "vue";

import IconFile from "@shared/ui/icons/IconFile.vue";

import { useFileUpload } from "@features/file-transfer/useFileUpload";

import type { FileAttachment } from "shared";

const props = defineProps<{ chatId: string; disabled: boolean }>();
const emit = defineEmits<{ change: [attachments: FileAttachment[]] }>();

const { uploadFile } = useFileUpload();

interface PendingFile {
    file: File;
    status: "uploading" | "done" | "error";
    attachment?: FileAttachment;
}

const pending = ref<PendingFile[]>([]);

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    input.value = "";

    const entries: PendingFile[] = files.map((file) => ({
        file,
        status: "uploading",
    }));
    pending.value.push(...entries);

    await Promise.all(
        entries.map(async (entry) => {
            try {
                entry.attachment = await uploadFile(entry.file, props.chatId);
                entry.status = "done";
            } catch {
                entry.status = "error";
            }
            emitChange();
        })
    );
}

function remove(index: number) {
    pending.value.splice(index, 1);
    emitChange();
}

function emitChange() {
    emit(
        "change",
        pending.value
            .filter((p) => p.status === "done" && p.attachment)
            .map((p) => p.attachment!)
    );
}

function clear() {
    pending.value = [];
}

defineExpose({ clear });
</script>

<template>
    <div
        v-if="pending.length"
        style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px"
    >
        <div
            v-for="(p, i) in pending"
            :key="i"
            :style="{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#1a1a1a',
                border: '1px solid',
                borderColor: p.status === 'error' ? '#7f1d1d' : '#333',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                color: p.status === 'error' ? '#f87171' : '#ccc',
            }"
        >
            <span v-if="p.status === 'uploading'" style="color: #666">⏳</span>
            <span v-else-if="p.status === 'error'">✕</span>
            <span v-else>📎</span>
            <span>{{ p.file.name }}</span>
            <span style="color: #666">{{ formatSize(p.file.size) }}</span>
            <button
                v-if="p.status !== 'uploading'"
                style="
                    background: none;
                    border: none;
                    color: #555;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    margin-left: 2px;
                "
                @click="remove(i)"
            >
                ✕
            </button>
        </div>
    </div>

    <label
        class="button-sm file-uploader__btn"
        :class="{ 'file-uploader__btn_disabled': disabled }"
    >
        <IconFile />
        <input
            type="file"
            multiple
            style="display: none"
            :disabled="disabled"
            @change="onFileChange"
        />
    </label>
</template>

<style scoped lang="scss">
.file-uploader__btn {
    cursor: pointer;
    width: 34px;
    height: 34px;
    min-width: 34px;

    &_disabled {
        opacity: 0.4;
        pointer-events: none;
    }
}
</style>
