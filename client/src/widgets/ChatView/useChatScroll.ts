import { nextTick, ref, watch } from "vue";
import type { Ref } from "vue";

import { useDebounce } from "@shared/lib/useDebounce";
import { useVisibility } from "@shared/lib/useVisibility";

import type { ScrollTarget } from "@features/chat-session/model/useChatSession";

import type { ChatItem } from "./useChatItems";
import type { PeerInfo } from "shared";
import type { VListHandle } from "virtua/vue";

// Порог у краёв (px), при котором запускаем подгрузку.
const EDGE = 400;
// Насколько близко к низу считаем «внизу» (для follow новых сообщений).
const BOTTOM = 80;

// Контроллер прокрутки для виртуализированного списка (virtua). Работает по
// индексам/офсету через VListHandle — без DOM-слушателей и querySelector.
export function useChatScroll(
    vlist: Ref<VListHandle | null>,
    items: () => ChatItem[],
    peer: () => PeerInfo | null,
    onRead: (nonce: string) => void,
    onLoadMore: () => Promise<void>,
    onLoadMoreBelow: () => Promise<void>,
    hasMoreBelow: () => boolean,
    scrollTarget: () => ScrollTarget,
    onScrollHandled: () => void,
    shiftMode: Ref<boolean>
): {
    onScroll: (offset: number) => void;
    onScrollEnd: () => void;
    atBottom: Ref<boolean>;
    topIndex: Ref<number>;
    highlightNonce: Ref<string | null>;
} {
    const { isVisible } = useVisibility();
    let loading = false;
    let initialDone = false;
    // Кулдаун между подгрузками: у края (особенно при drag скроллбара) offset
    // держится в зоне EDGE и триггерил бы loadMore подряд. Пауза разносит их.
    let loadCooldownUntil = 0;
    const LOAD_COOLDOWN = 300;
    // Внизу ли мы (для кнопки «вниз») и индекс верхнего видимого элемента (для
    // плавающей плашки текущей даты — sticky-заголовок при виртуализации).
    const atBottom = ref(true);
    const topIndex = ref(0);
    // nonce сообщения, к которому только что прыгнули — для кратковременной
    // подсветки (флеш). Сбрасывается debounce-таймером (повторный прыжок продлевает).
    const highlightNonce = ref<string | null>(null);
    const { schedule: scheduleHighlightClear } = useDebounce(() => {
        highlightNonce.value = null;
    }, 900);

    function flashHighlight(nonce: string): void {
        highlightNonce.value = nonce;
        scheduleHighlightClear();
    }

    // Отложенный флеш для плавного скролла: подсветку запускаем не сразу, а по
    // окончании прокрутки (scroll-end). Фолбэк-таймер — на случай, когда цель уже
    // в зоне видимости и scroll-end не выстреливает.
    let pendingFlash: string | null = null;
    let pendingFlashTimer: ReturnType<typeof setTimeout> | null = null;
    function flushPendingFlash(): void {
        if (pendingFlashTimer !== null) {
            clearTimeout(pendingFlashTimer);
            pendingFlashTimer = null;
        }
        if (pendingFlash !== null) {
            flashHighlight(pendingFlash);
            pendingFlash = null;
        }
    }
    function armPendingFlash(nonce: string): void {
        pendingFlash = nonce;
        if (pendingFlashTimer !== null) {
            clearTimeout(pendingFlashTimer);
        }
        pendingFlashTimer = setTimeout(flushPendingFlash, 700);
    }

    const lastIndex = () => items().length - 1;

    function refreshMarkers(): void {
        const h = vlist.value;
        if (!h) {
            return;
        }
        atBottom.value =
            h.scrollSize - h.scrollOffset - h.viewportSize < BOTTOM;
        topIndex.value = h.findItemIndex(h.scrollOffset);
    }

    // Помечаем прочитанными видимые сейчас сообщения собеседника. Диапазон видимых
    // индексов берём у virtua (findItemIndex по офсету) — узлы вне окна размонтированы.
    function markVisibleRead(): void {
        const h = vlist.value;
        if (!h || !isVisible.value) {
            return;
        }
        const start = h.findItemIndex(h.scrollOffset);
        const end = h.findItemIndex(h.scrollOffset + h.viewportSize);
        const its = items();
        for (
            let i = Math.max(0, start);
            i <= Math.min(its.length - 1, end);
            i++
        ) {
            const it = its[i];
            if (
                it.type === "message" &&
                !it.msg.isRead &&
                it.msg.from === peer()?.signPubKey
            ) {
                onRead(it.msg.nonce);
            }
        }
    }

    async function onScroll(offset: number): Promise<void> {
        const h = vlist.value;
        if (!h) {
            return;
        }
        const fromBottom = h.scrollSize - offset - h.viewportSize;
        atBottom.value = fromBottom < BOTTOM;
        topIndex.value = h.findItemIndex(offset);
        if (loading || performance.now() < loadCooldownUntil) {
            return;
        }

        // Вверх: prepend старее. shift=true держит позицию при добавлении сверху.
        if (offset < EDGE) {
            loading = true;
            shiftMode.value = true;
            await onLoadMore();
            await nextTick();
            shiftMode.value = false;
            loading = false;
            loadCooldownUntil = performance.now() + LOAD_COOLDOWN;
            return;
        }
        // Вниз (из истории): append новее. Позицию virtua держит сам (растёт снизу).
        if (hasMoreBelow() && h.scrollSize - offset - h.viewportSize < EDGE) {
            loading = true;
            await onLoadMoreBelow();
            await nextTick();
            loading = false;
            loadCooldownUntil = performance.now() + LOAD_COOLDOWN;
        }
    }

    function onScrollEnd(): void {
        // Плавный скролл к цели завершился — запускаем отложенную подсветку.
        flushPendingFlash();
        markVisibleRead();
    }

    // Дозаполнение вьюпорта: если после смены окна список короче экрана, скролла
    // нет → onScroll не сработает и подгрузка не стартует. Догружаем (сначала
    // старее, потом новее), пока не станет прокручиваемым или пока есть что грузить.
    async function fillViewport(): Promise<void> {
        const h = vlist.value;
        if (!h || loading) {
            return;
        }
        loading = true;
        try {
            for (let i = 0; i < 12; i++) {
                await nextTick();
                // Уже прокручивается — дозаполнение не нужно.
                if (h.scrollSize > h.viewportSize + 4) {
                    return;
                }
                const before = items().length;
                shiftMode.value = true;
                await onLoadMore(); // старее (prepend)
                await nextTick();
                shiftMode.value = false;
                if (items().length !== before) {
                    continue;
                }
                // Старее нет — пробуем новее (append).
                const mid = items().length;
                await onLoadMoreBelow();
                await nextTick();
                // Грузить больше нечего.
                if (items().length === mid) {
                    return;
                }
            }
        } finally {
            loading = false;
        }
    }

    // Позиционирование после смены окна (прыжок по дате / возврат к настоящему).
    watch(scrollTarget, async (target) => {
        if (!target) {
            return;
        }
        await nextTick();
        const h = vlist.value;
        if (h) {
            if (target === "bottom") {
                h.scrollToIndex(lastIndex(), { align: "end" });
            } else {
                const idx = items().findIndex(
                    (it) =>
                        it.type === "message" && it.msg.nonce === target.nonce
                );
                if (idx >= 0) {
                    h.scrollToIndex(idx, {
                        align: target.align ?? "start",
                        smooth: target.smooth,
                    });
                }
                // Плавный скролл — подсветку откладываем до конца прокрутки
                // (scroll-end). Мгновенный — подсвечиваем сразу.
                if (target.smooth) {
                    armPendingFlash(target.nonce);
                } else {
                    flashHighlight(target.nonce);
                }
            }
            await nextTick();
            await fillViewport();
            refreshMarkers();
            markVisibleRead();
        }
        onScrollHandled();
    });

    // «Всплывание» как в ТГ: строка реакций меняет высоту бабла. virtua якорит
    // сверху (прирост уходит вниз), а мы у нижнего края хотим держать низ —
    // тогда высота съедается сверху и сообщение уезжает вверх. Считаем число
    // сообщений с реакциями: оно меняется ровно когда строка появляется/исчезает.
    const reactedCount = () =>
        items().reduce(
            (n, it) =>
                it.type === "message" &&
                it.msg.reactions &&
                Object.keys(it.msg.reactions).length > 0
                    ? n + 1
                    : n,
            0
        );

    watch(reactedCount, async () => {
        // Решение по atBottom принимаем ДО ожидания (nextTick может успеть
        // сдвинуть позицию и сбросить флаг).
        if (!atBottom.value) {
            return;
        }
        await nextTick();
        const h = vlist.value;
        if (h) {
            h.scrollToIndex(lastIndex(), { align: "end" });
            refreshMarkers();
        }
    });

    watch(
        () => items().length,
        async (len, old) => {
            await nextTick();
            const h = vlist.value;
            if (!h) {
                return;
            }
            if (!initialDone && len > 0) {
                // Первая загрузка — открываем на последних.
                initialDone = true;
                h.scrollToIndex(lastIndex(), { align: "end" });
                await nextTick();
                await fillViewport();
                h.scrollToIndex(lastIndex(), { align: "end" });
                refreshMarkers();
                markVisibleRead();
            } else if (
                len > (old ?? 0) &&
                atBottom.value &&
                !hasMoreBelow() &&
                !loading
            ) {
                // Новое входящее и мы внизу — доезжаем к нему (follow).
                h.scrollToIndex(lastIndex(), { align: "end" });
                await nextTick();
                refreshMarkers();
                markVisibleRead();
            }
        }
    );

    return { onScroll, onScrollEnd, atBottom, topIndex, highlightNonce };
}
