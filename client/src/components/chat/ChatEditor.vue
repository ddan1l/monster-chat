<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
    disabled: boolean;
    editingNonce: string | null;
    editingText: string;
}>();

const emit = defineEmits<{
    send: [text: string];
    editSubmit: [nonce: string, newText: string];
    editCancel: [];
}>();

const text = ref("");
const localEditText = ref("");

watch(() => props.editingText, (val) => {
    localEditText.value = val;
}, { immediate: true });

function send() {
    if (text.value.trim()) {
        emit("send", text.value.trim());
        text.value = "";
    }
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
    <div style="display: flex; gap: 8px; margin-top: 8px">
        <template v-if="editingNonce">
            <input
                v-model="localEditText"
                style="flex: 1"
                @keydown.enter="submitEdit"
                @keydown.esc="emit('editCancel')"
            />
            <button @click="submitEdit">Сохранить</button>
            <button @click="emit('editCancel')">Отмена</button>
        </template>
        <template v-else>
            <input
                v-model="text"
                placeholder="Сообщение"
                style="flex: 1"
                :disabled="disabled"
                @keydown.enter="send"
            />
            <button :disabled="disabled" @click="send">Отправить</button>
        </template>
    </div>
</template>
