<script setup lang="ts">
import { onBeforeUnmount } from "vue";

import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { BubbleMenu } from "@tiptap/vue-3/menus";

const props = withDefaults(
    defineProps<{
        modelValue?: string;
        placeholder?: string;
        autofocus?: boolean;
    }>(),
    { modelValue: "", placeholder: "Сообщение...", autofocus: false }
);

const emit = defineEmits<{
    "update:modelValue": [value: string];
    input: [];
    submit: [];
}>();

const editor = useEditor({
    content: props.modelValue,
    extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: props.placeholder }),
    ],
    autofocus: props.autofocus,
    onUpdate({ editor }) {
        emit("update:modelValue", editor.getHTML());
        emit("input");
    },
    editorProps: {
        handleKeyDown(_, event) {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                emit("submit");
                return true;
            }
            return false;
        },
    },
});

// Обновляем содержимое когда родитель меняет modelValue извне (режим редактирования).
function setContent(html: string) {
    if (!editor.value) return;
    if (editor.value.getHTML() !== html) {
        editor.value.commands.setContent(html);
    }
}

function clear() {
    editor.value?.commands.clearContent(true);
}

function focus() {
    editor.value?.commands.focus();
}

onBeforeUnmount(() => editor.value?.destroy());

defineExpose({ setContent, clear, focus });
</script>

<template>
    <div class="mc-editor">
        <BubbleMenu v-if="editor" :editor="editor" class="mc-editor__bubble">
            <button
                class="mc-editor__bubble-btn"
                :class="{
                    'mc-editor__bubble-btn_active': editor.isActive('bold'),
                }"
                @click="editor.chain().focus().toggleBold().run()"
            >
                <b>B</b>
            </button>
            <button
                class="mc-editor__bubble-btn"
                :class="{
                    'mc-editor__bubble-btn_active': editor.isActive('italic'),
                }"
                @click="editor.chain().focus().toggleItalic().run()"
            >
                <i>I</i>
            </button>
            <button
                class="mc-editor__bubble-btn"
                :class="{
                    'mc-editor__bubble-btn_active': editor.isActive('strike'),
                }"
                @click="editor.chain().focus().toggleStrike().run()"
            >
                <s>S</s>
            </button>
        </BubbleMenu>

        <EditorContent class="mc-editor__content" :editor="editor" />
    </div>
</template>

<style lang="scss">
.mc-editor {
    position: relative;
    flex: 1;

    &__content {
        .tiptap {
            outline: none;
            font-size: 14px;
            font-weight: 550;
            line-height: 1.5;
            min-height: 22px;
            color: var(--mc-fg);

            p {
                margin: 0;
            }
            p + p {
                margin-top: 4px;
            }
            code {
                background: var(--mc-bg-rail);
                border: 1px solid var(--mc-line);
                padding: 1px 4px;
                font-size: 0.85em;
            }

            p.is-editor-empty:first-child::before {
                content: attr(data-placeholder);
                color: var(--mc-fg-dim);
                pointer-events: none;
                float: left;
                height: 0;
            }
        }
    }

    &__bubble {
        display: flex;
        gap: 2px;
        background: var(--mc-bg-window);
        border: 1px solid var(--mc-line-hard);
        padding: 3px;
    }

    &__bubble-btn {
        padding: 3px 8px;
        font-size: 13px;
        color: var(--mc-fg-mute);
        transition: 0.1s;
        min-width: 28px;

        &:hover {
            color: var(--mc-fg);
            background: var(--mc-bg-sel);
        }
        &_active {
            color: var(--mc-acid);
        }
    }
}
</style>
