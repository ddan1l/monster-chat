<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import { VList } from "virtua/vue";

import { useDebounce } from "@shared/lib/useDebounce";

import { activeChatAtBottom } from "@entities/chat/useChats";

import type {
    DecryptedMessage,
    ScrollTarget,
} from "@features/chat-session/model/useChatSession";

import ChatDateCalendar from "./ChatDateCalendar.vue";
import ChatDatePill from "./ChatDatePill.vue";
import ChatDeleteModal from "./ChatDeleteModal.vue";
import ChatMessage from "./ChatMessage.vue";
import ChatScrollDownButton from "./ChatScrollDownButton.vue";
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
    // Число непрочитанных ниже (бейдж на кнопке «вниз»).
    newBelowCount: number;
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
    togglePin: [nonce: string];
    reaction: [nonce: string, emoji: string];
    reply: [msg: DecryptedMessage];
    jumpReply: [nonce: string, ts: number];
    read: [nonce: string];
}>();

const vlist = ref<VListHandle | null>(null);
// shift держит позицию прокрутки при добавлении сверху (prepend старой истории).
// Контроллер включает его только на время подгрузки вверх.
const shiftMode = ref(false);

const { items } = useChatItems(
    () => props.messages,
    () => props.isPeerTyping
);

// Одно контекстное меню на весь список (вместо floating-ui на каждую строку).
const ctxMenu = ref<InstanceType<typeof MessageContextMenu> | null>(null);
const ctxTarget = ref<DecryptedMessage | null>(null);
const ctxIsSelf = ref(false);
// Пузырь, к которому привязано меню (слева для чужих / справа для своих).
const ctxAnchor = ref<HTMLElement | null>(null);
// nonce сообщения, на котором открыто меню (для подсветки); null — меню закрыто.
const activeMenuNonce = ref<string | null>(null);
function onMessageContext(
    anchor: HTMLElement,
    msg: DecryptedMessage,
    isSelf: boolean
) {
    ctxAnchor.value = anchor;
    ctxTarget.value = msg;
    ctxIsSelf.value = isSelf;
    activeMenuNonce.value = msg.nonce;
    ctxMenu.value?.open();
}

// Подтверждение удаления: «Удалить у меня» или (для своих) «также у собеседника».
const deleteOpen = ref(false);
const deleteNonce = ref<string | null>(null);
const deleteIsSelf = ref(false);
function onDeleteRequest() {
    if (!ctxTarget.value) {
        return;
    }
    deleteNonce.value = ctxTarget.value.nonce;
    deleteIsSelf.value = ctxIsSelf.value;
    deleteOpen.value = true;
}
function onDeleteConfirm(alsoPeer: boolean) {
    const nonce = deleteNonce.value;
    if (nonce) {
        if (alsoPeer) {
            emit("deleteForAll", nonce);
        } else {
            emit("deleteForMe", nonce);
        }
    }
    deleteOpen.value = false;
}

// Календарь прыжка по дате: границы диапазона + дни с сообщениями грузим при
// открытии (клик по sticky-плашке).
const calendar = ref<{ days: Set<string>; min: number; max: number } | null>(
    null
);
async function openCalendar() {
    cancelHidePill();
    datePillVisible.value = true;
    calendar.value = await props.messageDays();
}

// Плашка даты появляется на скролле и гаснет через паузу бездействия. Пока
// открыт календарь — держим её видимой (отмена авто-скрытия).
const datePillVisible = ref(false);
const { schedule: scheduleHidePill, cancel: cancelHidePill } = useDebounce(
    () => {
        datePillVisible.value = false;
    },
    1500
);
function bumpDatePill(): void {
    datePillVisible.value = true;
    scheduleHidePill();
}
// Под курсором плашка не должна пропадать: держим видимой, на уходе — снова таймер.
function onDatePillHover(over: boolean): void {
    if (over) {
        cancelHidePill();
        datePillVisible.value = true;
    } else {
        scheduleHidePill();
    }
}
function onPick(ts: number) {
    calendar.value = null;
    scheduleHidePill();
    props.onJumpToDate(ts);
}
function closeCalendar() {
    calendar.value = null;
    scheduleHidePill();
}

// --- Кастомный overlay-скроллбар (нативный скрыт, чтобы не резервировать место).
// Позицию/размер thumb считаем из метрик virtua; перетаскивание — через scrollTo.
const thumbTop = ref(0);
const thumbHeight = ref(0);
// barActive — тянем thumb (держим видимым и вне hover).
const barActive = ref(false);
const MIN_THUMB = 28;

// Скролл списка: обновляем плашку даты и overlay-скроллбар, отдаём офсет контроллеру.
function onListScroll(offset: number): void {
    bumpDatePill();
    updateScrollbar();
    onScroll(offset);
}
function onListScrollEnd(): void {
    onScrollEnd();
    updateScrollbar();
}

const { onScroll, onScrollEnd, atBottom, topIndex, highlightNonce } =
    useChatScroll(
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

function updateScrollbar(): void {
    const h = vlist.value;
    if (!h) {
        thumbHeight.value = 0;
        return;
    }
    const { scrollOffset, scrollSize, viewportSize } = h;
    // Нет переполнения — бара нет.
    if (scrollSize <= viewportSize + 1) {
        thumbHeight.value = 0;
        return;
    }
    const th = Math.max(MIN_THUMB, (viewportSize / scrollSize) * viewportSize);
    const maxTop = viewportSize - th;
    const ratio = scrollOffset / (scrollSize - viewportSize);
    thumbHeight.value = th;
    thumbTop.value = Math.min(maxTop, Math.max(0, ratio * maxTop));
}

function onThumbDown(e: PointerEvent): void {
    e.preventDefault();
    if (!vlist.value) {
        return;
    }
    barActive.value = true;
    // Относительный drag: скроллим по дельте движения от ТЕКУЩЕГО offset (не по
    // абсолютной позиции курсора). Так после prepend позиция, которую shift сдвинул
    // вниз (thumb уехал к середине), сохраняется — offset уходит из зоны EDGE и
    // подгрузка не триггерится повторно.
    let lastY = e.clientY;
    function move(ev: PointerEvent): void {
        const hh = vlist.value;
        if (!hh) {
            return;
        }
        const { scrollOffset, scrollSize, viewportSize } = hh;
        const scrollable = scrollSize - viewportSize;
        const maxTop = viewportSize - thumbHeight.value;
        if (scrollable <= 0 || maxTop <= 0) {
            return;
        }
        const dy = ev.clientY - lastY;
        lastY = ev.clientY;
        const next = scrollOffset + (dy / maxTop) * scrollable;
        hh.scrollTo(Math.min(scrollable, Math.max(0, next)));
        updateScrollbar();
    }
    function up(): void {
        barActive.value = false;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
}

// Пересчёт при изменении контента (новые сообщения / подгрузка) и размера окна.
watch(
    () => props.messages.length,
    () => nextTick(updateScrollbar)
);
function onWinResize(): void {
    updateScrollbar();
}
onMounted(() => {
    window.addEventListener("resize", onWinResize);
    nextTick(updateScrollbar);
});
onUnmounted(() => window.removeEventListener("resize", onWinResize));

// Плавающая плашка текущей даты (sticky-заголовок): virtua ломает CSS position:
// sticky у строк, поэтому показываем дату верхнего видимого элемента поверх списка.
const currentDayTs = computed(() => {
    const it = items.value[topIndex.value];
    return it && it.type === "message" ? it.msg.timestamp : null;
});

const currentDayLabel = computed(() => {
    if (currentDayTs.value == null) {
        return "";
    }
    return new Date(currentDayTs.value).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
});

const showDatePill = computed(
    () => props.messages.length > 0 && !!currentDayLabel.value
);

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
        <ChatDatePill
            :label="currentDayLabel"
            :visible="showDatePill && (datePillVisible || calendar != null)"
            @open="openCalendar"
            @hover="onDatePillHover"
        />

        <VList
            ref="vlist"
            v-slot="{ item }"
            class="mc-chat-messages"
            :data="items"
            :shift="shiftMode"
            @scroll="onListScroll"
            @scroll-end="onListScrollEnd"
        >
            <ChatTypingIndicator
                v-if="item.type === 'typing'"
                key="typing"
                :peer="peer"
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
                :active="item.msg.nonce === activeMenuNonce"
                :highlighted="item.msg.nonce === highlightNonce"
                @open-menu="onMessageContext"
                @react="(nonce, emoji) => emit('reaction', nonce, emoji)"
                @jump-reply="(nonce, ts) => emit('jumpReply', nonce, ts)"
            />
        </VList>

        <!-- Кастомный overlay-скроллбар: абсолютом поверх ленты, не влияет на layout. -->
        <div
            v-if="thumbHeight"
            class="mc-scrollbar"
            :class="{ 'mc-scrollbar_active': barActive }"
            :style="{ top: thumbTop + 'px', height: thumbHeight + 'px' }"
            @pointerdown="onThumbDown"
        />

        <ChatScrollDownButton
            v-if="hasMoreBelow || !atBottom"
            :count="newBelowCount"
            @click="onToLatest"
        />

        <MessageContextMenu
            ref="ctxMenu"
            :anchor="ctxAnchor"
            :is-self="ctxIsSelf"
            :text="ctxTarget?.text ?? ''"
            :editing-nonce="editingNonce"
            :pinned="ctxTarget?.pinned ?? false"
            :placement="ctxIsSelf ? 'top-end' : 'top-start'"
            @edit-start="
                ctxTarget &&
                emit('editStart', ctxTarget.nonce, ctxTarget.text ?? '')
            "
            @delete="onDeleteRequest"
            @toggle-pin="ctxTarget && emit('togglePin', ctxTarget.nonce)"
            @reply="ctxTarget && emit('reply', ctxTarget)"
            @reaction="
                (emoji) => ctxTarget && emit('reaction', ctxTarget.nonce, emoji)
            "
            @close="activeMenuNonce = null"
        />

        <ChatDeleteModal
            :visible="deleteOpen"
            :is-self="deleteIsSelf"
            @confirm="onDeleteConfirm"
            @close="deleteOpen = false"
        />

        <ChatDateCalendar
            v-if="calendar"
            :min="calendar.min"
            :max="calendar.max"
            :days="calendar.days"
            :selected="currentDayTs ?? undefined"
            @pick="onPick"
            @close="closeCalendar"
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

// Overlay-скроллбар: тонкий thumb у правого края, поверх контента (position:
// absolute — layout не трогает). Появляется при наведении на ленту или при
// перетаскивании.
.mc-scrollbar {
    position: absolute;
    right: 3px;
    width: 5px;
    z-index: 19;
    border-radius: 3px;
    background: color-mix(in srgb, var(--mc-fg) 22%, transparent);
    opacity: 0;
    transition: opacity 0.15s;
    cursor: pointer;

    &:hover,
    &_active {
        background: color-mix(in srgb, var(--mc-fg) 38%, transparent);
    }
}
.mc-chat-messages-wrap:hover .mc-scrollbar,
.mc-scrollbar_active {
    opacity: 1;
}

.mc-chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    // Нативный скроллбар убран из потока — нулевой gutter, поэтому отступы
    // остаются ровно заданными и одинаковыми во всех браузерах. Полосу рисуем
    // сами (overlay-бар абсолютом, см. .mc-scrollbar) — она не влияет на layout.
    scrollbar-width: none;
    &::-webkit-scrollbar {
        display: none;
    }
    overflow-anchor: none;
    padding: 0;
    margin: 0;
    // Фон (сетка + свечение) вынесен на общий контейнер .chat-view__body, чтобы
    // непрерывно тянуться под сообщениями и редактором — здесь прозрачно.
    background: transparent;
}
</style>
