<script setup lang="ts">
import { computed, ref } from "vue";

import { format } from "date-fns";
import DOMPurify from "dompurify";

import AppMenu from "@shared/ui/components/AppMenu.vue";
import AppMenuItem from "@shared/ui/components/AppMenuItem.vue";
import IconCheck from "@shared/ui/icons/IconCheck.vue";

import UserAvatar from "@entities/user/ui/UserAvatar.vue";

import { useFileDownload } from "@features/file-transfer/useFileDownload";
import type { DecryptedMessage } from "@features/send-message/useChatSession";

import type { PeerInfo } from "shared";

const { downloadFile } = useFileDownload();

const props = defineProps<{
    msg: DecryptedMessage;
    peer: PeerInfo | null;
    tail: boolean;
    continued: boolean;
    editingNonce: string | null;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
    deleteForMe: [nonce: string];
    deleteForAll: [nonce: string];
}>();

const isSelf = computed(() => props.msg.from !== props.peer?.signPubKey);

// Текст сообщения приходит от пира как HTML — чистим от любого
// активного содержимого (script/onerror/...) перед вставкой через v-html.
const safeText = computed(() =>
    DOMPurify.sanitize(props.msg.text ?? "", {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "code", "span"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    })
);

const bubble = ref<HTMLElement | null>(null);
const menu = ref<InstanceType<typeof AppMenu> | null>(null);
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
            ref="bubble"
            class="mc-message"
            :class="{ 'mc-message_self': isSelf }"
            @contextmenu="menu?.openAt($event)"
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
                    <IconCheck v-if="isSelf" :double="msg.isRead" />
                </span>
            </div>
        </div>

        <AppMenu
            ref="menu"
            :anchor="bubble"
            :placement="isSelf ? 'top-end' : 'top-start'"
        >
            <template #default="{ close }">
                <AppMenuItem
                    v-if="isSelf"
                    :disabled="editingNonce !== null"
                    @click="
                        emit('editStart', msg.nonce, msg.text ?? '');
                        close();
                    "
                >
                    ✏️ Редактировать
                </AppMenuItem>
                <AppMenuItem
                    @click="
                        emit('deleteForMe', msg.nonce);
                        close();
                    "
                >
                    🗑️ Удалить у меня
                </AppMenuItem>
                <AppMenuItem
                    v-if="isSelf"
                    variant="danger"
                    @click="
                        emit('deleteForAll', msg.nonce);
                        close();
                    "
                >
                    🗑️ Удалить у всех
                </AppMenuItem>
            </template>
        </AppMenu>
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
        background-color: var(--mc-acid);
        color: var(--mc-fd-dark);
        box-shadow: 0 0 24px var(--mc-acid-glow);
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
