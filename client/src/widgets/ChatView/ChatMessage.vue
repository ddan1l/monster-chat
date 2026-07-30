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
    if (cached && cached.text === text) {
        return cached.html;
    }
    const html = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "code", "span"],
        ALLOWED_ATTR: ["href", "target", "rel"],
    });
    sanitizeCache.set(nonce, { text, html });
    return html;
}
</script>

<script setup lang="ts">
// eslint-disable-next-line import/order -- отдельный module-блок выше, свой порядок
import { computed } from "vue";

import UserAvatar from "@entities/user/ui/UserAvatar.vue";

import type { DecryptedMessage } from "@features/chat-session/model/useChatSession";
import { useFileDownload } from "@features/file-transfer/useFileDownload";

import MessageMeta from "./MessageMeta.vue";

import type { PeerInfo } from "shared";

const { downloadFile } = useFileDownload();

const props = defineProps<{
    msg: DecryptedMessage;
    peer: PeerInfo | null;
    tail: boolean;
    continued: boolean;
    // Открыто ли контекстное меню на этом сообщении (для подсветки).
    active: boolean;
    // Кратковременная подсветка после прыжка к сообщению (флеш).
    highlighted: boolean;
}>();

// Контекстное меню одно на список (см. ChatMessages) — отдаём наверх сам пузырь
// (как якорь для позиционирования) и данные сообщения, чтобы не плодить
// floating-ui на каждую строку.
const emit = defineEmits<{
    openMenu: [anchor: HTMLElement, msg: DecryptedMessage, isSelf: boolean];
    react: [nonce: string, emoji: string];
    jumpReply: [nonce: string, ts: number];
}>();

const isSelf = computed(() => props.msg.from !== props.peer?.signPubKey);

// Превью цитаты (reply): автор + текст без разметки.
const reply = computed(() => {
    const r = props.msg.replyTo;
    if (!r) {
        return null;
    }
    return {
        nonce: r.nonce,
        ts: r.ts,
        author: r.from === props.peer?.signPubKey ? props.peer?.name : "Вы",
        text: (r.text ?? "").replace(/<[^>]*>/g, "").trim() || "Вложение",
    };
});

// Чипы реакций: эмодзи + счётчик. «Моя» = среди реагировавших есть не-собеседник
// (в 1-на-1 это мы) — такую пилюлю подсвечиваем.
const reactionChips = computed(() =>
    Object.entries(props.msg.reactions ?? {}).map(([emoji, keys]) => ({
        emoji,
        count: keys.length,
        mine: keys.some((k) => k !== props.peer?.signPubKey),
    }))
);

const safeText = computed(() =>
    sanitizeMessage(props.msg.nonce, props.msg.text ?? "")
);

function openMenu(e: MouseEvent): void {
    emit("openMenu", e.currentTarget as HTMLElement, props.msg, isSelf.value);
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
        <!-- Колонка «бабл + реакции». Аватар (сосед по строке, align-items:flex-end)
             выравнивается по низу этой колонки — т.е. по уровню реакций, если есть. -->
        <div class="mc-message-content">
            <div
                class="mc-message"
                :class="{
                    'mc-message_self': isSelf,
                    'mc-message_active': active,
                    'mc-message_highlighted': highlighted,
                }"
                @contextmenu.prevent="openMenu"
            >
                <button
                    v-if="reply"
                    class="mc-message__reply"
                    @click.stop="emit('jumpReply', reply.nonce, reply.ts)"
                >
                    <span class="mc-message__reply-author">{{
                        reply.author
                    }}</span>
                    <span class="mc-message__reply-text">{{ reply.text }}</span>
                </button>

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
                    ><MessageMeta
                        :msg="msg"
                        :is-self="isSelf"
                        class="mc-message__meta-float"
                    />
                </div>
            </div>

            <!-- Реакции — строкой ПОД баблом (без аватаров): эмодзи + счётчик.
                 Появление/исчезновение анимируем по высоте: колонка растёт плавно,
                 и аватар (align-items:flex-end) плавно съезжает к строке реакций. -->
            <Transition name="mc-react">
                <div v-if="reactionChips.length" class="mc-message__reactions">
                    <button
                        v-for="r in reactionChips"
                        :key="r.emoji"
                        class="mc-message__reaction"
                        :class="{ 'mc-message__reaction_mine': r.mine }"
                        @click.stop="emit('react', msg.nonce, r.emoji)"
                    >
                        <span class="mc-message__reaction-emoji">{{
                            r.emoji
                        }}</span>
                        <span class="mc-message__reaction-count">{{
                            r.count
                        }}</span>
                    </button>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.mc-message-wrapper {
    display: flex;
    // Строка: аватар + колонка «бабл+реакции». align-items:flex-end сажает аватар
    // на низ колонки — т.е. на уровень реакций, если они есть.
    align-items: flex-end;
    gap: 8px;
    padding: 8px 22px;
    // virtua раскладывает строки через position: absolute — из-за этого нативное
    // выделение «утекает» на соседние сообщения. Разрешаем выделять только текст
    // сообщения, всё остальное — невыделяемо (якорь ставится в тексте корректно).
    user-select: none;
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

// Колонка «бабл + реакции». flex:1 даёт баблу определённый контейнер для его
// max-width:40% (иначе процент считать не от чего). align — по стороне сообщения.
.mc-message-content {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
.mc-message-wrapper_self .mc-message-content {
    align-items: flex-end;
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

        // Свои (без рамки, с фоном) — тёмный «бордер» (кольцо, без сдвига) +
        // мягкое свечение.
        &.mc-message_active {
            box-shadow:
                0 0 0 1px var(--mc-bg-window),
                0 0 12px 2px color-mix(in srgb, var(--mc-acid) 50%, transparent);
        }
    }

    // Подсветка сообщения, на котором открыто контекстное меню (чужие — кольцо).
    &_active {
        box-shadow: 0 0 0 1.5px var(--mc-acid);
    }

    // Флеш после прыжка к сообщению (цитата / закреплённое / дата): «поп»
    // масштабом (виден на любом цвете) + лёгкий белый оверлей.
    &_highlighted {
        animation: mc-message-pop 0.8s ease-in-out;
    }

    &_highlighted::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: #fff;
        opacity: 0;
        animation: mc-message-flash 0.8s ease-in-out;
    }

    &__body {
        display: flow-root;
        // Текст сообщения — единственная выделяемая область (см. wrapper выше).
        user-select: text;
    }

    &__meta-float {
        float: right;
        margin: 7px 0 0 8px;
    }

    &__reply {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1px;
        width: 100%;
        margin-bottom: 5px;
        padding: 2px 6px;
        text-align: left;
        background: color-mix(in srgb, var(--mc-acid) 8%, transparent);
        border-left: 2px solid var(--mc-acid);
        cursor: pointer;
        overflow: hidden;
    }

    &__reply-author {
        font-size: 12px;
        font-weight: 700;
        color: var(--mc-acid);
    }

    &__reply-text {
        max-width: 100%;
        font-size: 12px;
        color: var(--mc-fg-mute);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    // На своём (acid) пузыре acid-акцент сливается — тёмный вариант цитаты.
    &_self &__reply {
        background: rgba(0, 0, 0, 0.05);
        border-left-color: rgba(0, 0, 0, 0.45);
    }
    &_self &__reply-author {
        color: var(--mc-fg-message);
    }
    &_self &__reply-text {
        color: color-mix(in srgb, var(--mc-fg-message) 65%, transparent);
    }

    &__file {
        margin-bottom: 6px;
    }
}

// Строка реакций под баблом (внутри колонки .mc-message-content — уже под баблом,
// смещение не нужно).
.mc-message__reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
}

// Плавное появление/скрытие строки реакций: колонка растёт/сжимается по высоте, и
// аватар (align-items:flex-end) плавно съезжает вниз/вверх. max-height достаточно
// под одну строку; после перехода класс снимается — высота снова auto.
.mc-react-enter-active,
.mc-react-leave-active {
    overflow: hidden;
    transition:
        max-height 0.13s ease,
        opacity 0.13s ease,
        margin-top 0.13s ease;
}
.mc-react-enter-from,
.mc-react-leave-to {
    max-height: 0;
    margin-top: 0;
    opacity: 0;
}
.mc-react-enter-to,
.mc-react-leave-from {
    max-height: 32px;
    opacity: 1;
}

.mc-message__reaction {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    font-size: 12px;
    font-weight: 600;
    color: var(--mc-fg-dim);
    background: var(--mc-bg-window);
    border: 1px solid var(--mc-line-hard);
    cursor: pointer;

    // Реакция, которую поставили мы — подсвечена acid-акцентом (как в дизайне).
    &_mine {
        color: var(--mc-fg);
        background: color-mix(in srgb, var(--mc-acid) 10%, transparent);
        border-color: var(--mc-acid);
    }
}

.mc-message__reaction-count {
    // Без фикс-высоты — цифра занимает свою натуральную высоту. По вертикали её
    // центрирует сама пилюля (align-items: center), line-height: 1 убирает
    // лишние поля строки, чтобы цифра не выглядела вытянутой.
    font-family: var(--mc-mono);
    font-size: 10px;
    line-height: 1;
    font-weight: 700;
    color: var(--mc-fg-dim);
}
.mc-message__reaction_mine .mc-message__reaction-count {
    color: var(--mc-acid);
}

// Нормализация эмодзи: фиксированный бокс + emoji-презентация (чинит «текстовое»
// ❤️ и разнобой метрик Segoe/Apple/Noto). Работает для любого эмодзи.
.mc-message__reaction-emoji {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    font-size: 12px;
    line-height: 1;
    font-family:
        "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif;
    font-variant-emoji: emoji;
}

.mc-message-wrapper_grouped {
    padding-bottom: 2px !important;
}
.mc-message-wrapper_continued {
    padding-top: 2px !important;
}

@keyframes mc-message-flash {
    0% {
        opacity: 0;
    }
    25%,
    45% {
        opacity: 0.45;
    }
    100% {
        opacity: 0;
    }
}

@keyframes mc-message-pop {
    0% {
        transform: scale(1);
    }
    20% {
        transform: scale(1.035);
    }
    45% {
        transform: scale(1);
    }
    100% {
        transform: scale(1);
    }
}
</style>
