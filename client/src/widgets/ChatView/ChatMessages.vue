<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";

import { VList } from "virtua/vue";

import { activeChatAtBottom } from "@entities/chat/useChats";

import type {
    DecryptedMessage,
    ScrollTarget,
} from "@features/chat-session/model/useChatSession";

import ChatDateCalendar from "./ChatDateCalendar.vue";
import ChatDateDivider from "./ChatDateDivider.vue";
import ChatMessage from "./ChatMessage.vue";
import ChatTypingIndicator from "./ChatTypingIndicator.vue";
import MessageContextMenu from "./MessageContextMenu.vue";
import { useChatItems } from "./useChatItems";
import { useChatScroll } from "./useChatScroll";

import type { PeerInfo } from "shared";
import type { VListHandle } from "virtua/vue";

const props = defineProps<{
    messages: DecryptedMessage[];
    peer: PeerInfo | null;
    editingNonce: string | null;
    isPeerTyping: boolean;
    hasMoreBelow: boolean;
    // Есть непрочитанные ниже (для пульсации кнопки «вниз»).
    hasNewBelow: boolean;
    scrollTarget: ScrollTarget;
    onLoadMore: () => Promise<void>;
    onLoadMoreBelow: () => Promise<void>;
    onJumpToDate: (ts: number) => void;
    onJumpToLatest: () => void;
    onScrollHandled: () => void;
    messageDays: () => Promise<{
        days: Set<string>;
        min: number;
        max: number;
    } | null>;
}>();

const emit = defineEmits<{
    editStart: [nonce: string, text: string];
    deleteForMe: [nonce: string];
    deleteForAll: [nonce: string];
    read: [nonce: string];
}>();

const vlist = ref<VListHandle | null>(null);
// shift держит позицию прокрутки при добавлении сверху (prepend старой истории).
// Контроллер включает его только на время подгрузки вверх.
const shiftMode = ref(false);

const { items } = useChatItems(() => props.messages);

// Одно контекстное меню на весь список (вместо floating-ui на каждую строку).
const ctxMenu = ref<InstanceType<typeof MessageContextMenu> | null>(null);
const ctxTarget = ref<DecryptedMessage | null>(null);
const ctxIsSelf = ref(false);
function onMessageContext(
    e: MouseEvent,
    msg: DecryptedMessage,
    isSelf: boolean
) {
    ctxTarget.value = msg;
    ctxIsSelf.value = isSelf;
    ctxMenu.value?.openAt(e);
}

// Календарь прыжка по дате: границы диапазона + дни с сообщениями грузим при
// открытии (клик по sticky-плашке).
const calendar = ref<{ days: Set<string>; min: number; max: number } | null>(
    null
);
async function openCalendar() {
    calendar.value = await props.messageDays();
}
function onPick(ts: number) {
    calendar.value = null;
    props.onJumpToDate(ts);
}

const { onScroll, onScrollEnd, atBottom, topIndex } = useChatScroll(
    vlist,
    () => items.value,
    () => props.peer,
    (nonce) => emit("read", nonce),
    props.onLoadMore,
    props.onLoadMoreBelow,
    () => props.hasMoreBelow,
    () => props.scrollTarget,
    props.onScrollHandled,
    shiftMode
);

// Плавающая плашка текущей даты (sticky-заголовок): virtua ломает CSS position:
// sticky у строк, поэтому показываем дату верхнего видимого элемента поверх списка.
const currentDayLabel = computed(() => {
    const it = items.value[topIndex.value];
    if (!it) return "";
    const ts = it.type === "divider" ? it.ts : it.msg.timestamp;
    return new Date(ts).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
});

// «Вниз»: возврат к последним. Идём через jumpToLatest всегда — он и позиционирует
// в конец, и помечает видимое прочитанным (через контроллер), гася пульс/бейдж.
function onToLatest() {
    props.onJumpToLatest();
}

// Отражаем положение открытого чата в глобал — уведомления решают по нему, видно
// ли входящее сразу. При размонтировании считаем «внизу» (нет открытого чата).
watch(atBottom, (v) => (activeChatAtBottom.value = v), { immediate: true });
onUnmounted(() => (activeChatAtBottom.value = true));
</script>

<template>
    <div class="mc-chat-messages-wrap">
        <button
            v-if="messages.length && currentDayLabel"
            class="mc-chat-messages__date-pill"
            title="Перейти к дате"
            @click="openCalendar"
        >
            {{ currentDayLabel }}
        </button>

        <VList
            ref="vlist"
            v-slot="{ item }"
            class="mc-chat-messages"
            :data="items"
            :shift="shiftMode"
            @scroll="onScroll"
            @scroll-end="onScrollEnd"
        >
            <ChatDateDivider
                v-if="item.type === 'divider'"
                :key="item.key"
                :timestamp="item.ts"
                :data-date="item.key"
                @open="openCalendar"
            />
            <ChatMessage
                v-else
                :key="item.msg.nonce"
                :msg="item.msg"
                :peer="peer"
                :tail="
                    messages[item.index + 1]
                        ? messages[item.index + 1].from !== item.msg.from
                        : !(isPeerTyping && item.msg.from === peer?.signPubKey)
                "
                :continued="
                    item.index > 0 &&
                    messages[item.index - 1]?.from === item.msg.from
                "
                @contextmenu="onMessageContext"
            />
        </VList>

        <ChatTypingIndicator
            v-if="isPeerTyping"
            :peer="peer"
            class="mc-chat-messages__typing"
        />

        <button
            v-if="hasMoreBelow || !atBottom"
            class="mc-chat-messages__to-latest"
            :class="{ 'mc-chat-messages__to-latest--pulse': hasNewBelow }"
            title="К последним сообщениям"
            @click="onToLatest"
        >
            ↓
        </button>

        <MessageContextMenu
            ref="ctxMenu"
            :anchor="null"
            :is-self="ctxIsSelf"
            :text="ctxTarget?.text ?? ''"
            :editing-nonce="editingNonce"
            :placement="ctxIsSelf ? 'top-end' : 'top-start'"
            @edit-start="
                ctxTarget &&
                emit('editStart', ctxTarget.nonce, ctxTarget.text ?? '')
            "
            @delete-for-me="ctxTarget && emit('deleteForMe', ctxTarget.nonce)"
            @delete-for-all="ctxTarget && emit('deleteForAll', ctxTarget.nonce)"
        />

        <ChatDateCalendar
            v-if="calendar"
            :min="calendar.min"
            :max="calendar.max"
            :days="calendar.days"
            @pick="onPick"
            @close="calendar = null"
        />
    </div>
</template>

<style lang="scss" scoped>
.mc-chat-messages-wrap {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
}

.mc-chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-anchor: none;
    padding: 0;
    margin: 0;
    background:
        radial-gradient(
            60% 40% at 100% 0%,
            var(--mc-acid-subtle),
            transparent 55%
        ),
        var(--mc-bg-chat);

    &__date-pill {
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 18;
        padding: 6px 12px;
        font-size: 11px;
        font-weight: 700;
        line-height: 130%;
        color: var(--mc-fg-mute);
        text-transform: uppercase;
        background: var(--mc-bg-window);
        border: 1px solid var(--mc-line-hard);
        cursor: pointer;

        &:hover {
            color: var(--mc-fg);
            border-color: var(--mc-acid);
        }
    }

    &__typing {
        position: absolute;
        left: 0;
        bottom: 0;
        z-index: 15;
    }

    &__to-latest {
        position: absolute;
        right: 16px;
        bottom: 16px;
        z-index: 20;
        width: 40px;
        height: 40px;
        font-size: 20px;
        line-height: 1;
        color: var(--mc-bg-window);
        background: var(--mc-acid);
        border: none;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);

        &--pulse {
            animation: mc-to-latest-pulse 1.4s ease-out infinite;
        }
    }
}

@keyframes mc-to-latest-pulse {
    0% {
        box-shadow:
            0 4px 14px rgba(0, 0, 0, 0.4),
            0 0 0 0 var(--mc-acid);
    }
    70% {
        box-shadow:
            0 4px 14px rgba(0, 0, 0, 0.4),
            0 0 0 12px transparent;
    }
    100% {
        box-shadow:
            0 4px 14px rgba(0, 0, 0, 0.4),
            0 0 0 0 transparent;
    }
}
</style>
