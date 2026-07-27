<script lang="ts">
// Модульный уровень (один раз на приложение, а не на инстанс сообщения).
import DOMPurify from "dompurify";

// Форсим rel="noopener noreferrer" на внешних ссылках — против reverse-tabnabbing
// (открытая страница не получит доступ к window.opener).
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
    }
});

// Кэш санитизации по nonce, общий для всех инстансов: сообщение неизменно (кроме
// правки — тогда меняется text), поэтому DOMPurify гоняем один раз, а не на каждый
// ре-монт (скользящее окно, прыжок по дате). Инвалидация — по несовпадению text.
const sanitizeCache = new Map<string, { text: string; html: string }>();

export function sanitizeMessage(nonce: string, text: string): string {
    const cached = sanitizeCache.get(nonce);
    if (cached && cached.text === text) return cached.html;
    const html = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "code", "span"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    });
    sanitizeCache.set(nonce, { text, html });
    return html;
}
</script>

<script setup lang="ts">
import { computed } from "vue";

import { format } from "date-fns";

import IconCheck from "@shared/ui/icons/IconCheck.vue";
import IconClock from "@shared/ui/icons/IconClock.vue";

import UserAvatar from "@entities/user/ui/UserAvatar.vue";

import type { DecryptedMessage } from "@features/chat-session/model/useChatSession";
import { useFileDownload } from "@features/file-transfer/useFileDownload";

import type { PeerInfo } from "shared";

const { downloadFile } = useFileDownload();

const props = defineProps<{
    msg: DecryptedMessage;
    peer: PeerInfo | null;
    tail: boolean;
    continued: boolean;
}>();

// Контекстное меню одно на список (см. ChatMessages) — отдаём наверх позицию
// клика и данные сообщения, чтобы не плодить floating-ui на каждую строку.
const emit = defineEmits<{
    contextmenu: [e: MouseEvent, msg: DecryptedMessage, isSelf: boolean];
}>();

const isSelf = computed(() => props.msg.from !== props.peer?.signPubKey);

const safeText = computed(() =>
    sanitizeMessage(props.msg.nonce, props.msg.text ?? "")
);

function onContextMenu(e: MouseEvent) {
    e.preventDefault();
    emit("contextmenu", e, props.msg, isSelf.value);
}
</script>

<template>
    <div
        :id="msg.nonce"
        class="mc-message-wrapper"
        :class="{
            'mc-message-wrapper_self': isSelf,
            'mc-message-wrapper_grouped': !tail,
            'mc-message-wrapper_continued': continued,
        }"
        :data-nonce="msg.nonce"
    >
        <UserAvatar
            v-if="!isSelf && peer?.avatar"
            :avatar-key="peer.avatar"
            :size="30"
            class="mc-message-wrapper__avatar"
            :class="{ 'mc-message-wrapper__avatar_hidden': !tail }"
        />
        <div
            class="mc-message"
            :class="{ 'mc-message_self': isSelf }"
            @contextmenu="onContextMenu"
        >
            <div
                v-for="(file, i) in msg.files"
                :key="i"
                class="mc-message__file"
                @click.stop="downloadFile(file)"
            >
                <span>📎</span>
                <span class="mc-message__file-name">{{ file.name }}</span>
                <span class="mc-message__file-size"
                    >{{ (file.size / 1024).toFixed(0) }} KB</span
                >
            </div>
            <div class="mc-message__body">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-html="safeText"></span
                ><span class="mc-message__meta">
                    <span v-if="msg.editedAt" class="mc-message__edited"
                        >изм.</span
                    >
                    <span class="mc-message__time">{{
                        format(msg.timestamp, "HH:mm")
                    }}</span>
                    <IconClock
                        v-if="isSelf && msg.status === 'pending'"
                        class="mc-message__pending"
                    />
                    <IconCheck v-else-if="isSelf" :double="msg.isRead" />
                </span>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-message-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 22px;
    &_self {
        justify-content: flex-end;
    }

    &__avatar {
        flex-shrink: 0;
        margin-bottom: 1px;
        &_hidden {
            visibility: hidden;
        }
    }
}
.mc-message {
    background: var(--mc-bg-bubble-in);
    border: 1px solid var(--mc-line);
    border-left: 2px solid var(--mc-line-hard);
    color: var(--mc-fg);
    padding: 9px 13px 7px;
    font-size: 14px;
    font-weight: 550;
    line-height: 1.45;
    word-wrap: break-word;
    position: relative;
    max-width: 40%;
    &_self {
        background-color: var(--mc-bg-message);
        color: var(--mc-fg-message);
        border: none;
    }

    &__body {
        display: flow-root;
    }

    &__meta {
        float: right;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: 8px;
        margin-top: 7px;
        font-size: 11px;
        opacity: 0.7;
        white-space: nowrap;
    }

    &__file {
        margin-bottom: 6px;
    }
}

.mc-message-wrapper_grouped {
    padding-bottom: 2px !important;
}
.mc-message-wrapper_continued {
    padding-top: 2px !important;
}
</style>
