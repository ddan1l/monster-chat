import { ref, toRaw } from "vue";

import {
    useChatMessages,
    PAGE_SIZE,
    startOfDay,
    type DecryptedMessage,
} from "@entities/message/useMessages";

// Куда прокрутить список после смены окна сообщений: к конкретному сообщению
// (прыжок по дате) или в самый низ (возврат к настоящему).
export type ScrollTarget =
    | { nonce: string; align?: "start" | "center"; smooth?: boolean }
    | "bottom"
    | null;

// Окно сообщений чата: локальное (IDB) состояние + пагинация вверх/вниз + прыжок
// по дате + локальные мутации. Транспорта/крипты тут нет — только дом истории на
// клиенте. Открытие/синк с сервером (open_chat) оркеструет useChatSession.
export function useMessageWindow(chatId: string) {
    const {
        saveChatMessage,
        decryptStored,
        setPinned,
        getPinned,
        getLastPage,
        getPageBefore,
        getPageFromDate,
        getPageAfter,
        getMessageDays,
        removeChatMessage,
    } = useChatMessages();

    const messages = ref<DecryptedMessage[]>([]);
    const hasMoreMessages = ref(false);
    // Виден ли исторический срез (есть сообщения новее загруженного окна). В этом
    // режиме входящие не подклеиваются в конец — они «внизу», за окном.
    const hasMoreBelow = ref(false);
    const scrollTarget = ref<ScrollTarget>(null);
    // Закреплённые сообщения чата (локально, все — не только из окна).
    const pinned = ref<DecryptedMessage[]>([]);

    const seenNonces = new Set<string>();
    const markSeen = (nonce: string) => seenNonces.add(nonce);
    const hasSeen = (nonce: string) => seenNonces.has(nonce);

    const decryptPage = (page: DecryptedMessage[]) =>
        Promise.all(page.map((m) => decryptStored(m)));

    // --- Локальные мутации окна ---

    function addMessage(msg: DecryptedMessage): void {
        // Свои сообщения сервер вернёт и нам — помечаем nonce, чтобы повторная
        // загрузка не создала дубль.
        seenNonces.add(msg.nonce);
        saveChatMessage(msg);
        // В историческом срезе новое сообщение не показываем в конце окна — оно
        // за пределами загруженного диапазона (кнопка «к последним» вернёт).
        if (!hasMoreBelow.value) {
            messages.value.push(msg);
        }
    }

    // Показать сообщение транзитно (провал расшифровки) — без записи в стор.
    function pushTransient(msg: DecryptedMessage): void {
        if (!hasMoreBelow.value) {
            messages.value.push(msg);
        }
    }

    function updateMessage(
        nonce: string,
        updates: Partial<DecryptedMessage>
    ): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx === -1) {
            return;
        }
        const updated: DecryptedMessage = {
            ...toRaw(messages.value[idx]),
            ...updates,
        };
        messages.value[idx] = updated;
        saveChatMessage(updated);
    }

    function applyEdit(edit: DecryptedMessage): void {
        if (!edit.targetNonce) {
            return;
        }
        updateMessage(edit.targetNonce, {
            text: edit.text,
            editedAt: edit.timestamp,
        });
    }

    function removeFromUI(nonce: string): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx !== -1) {
            messages.value.splice(idx, 1);
        }
    }

    async function removeMessage(nonce: string): Promise<void> {
        await removeChatMessage(nonce);
        removeFromUI(nonce);
    }

    // Применяет реакцию к сообщению (локально + персист). Одна реакция от
    // человека: при добавлении сначала снимаем его реакцию со ВСЕХ эмодзи, затем
    // ставим на выбранное. Используется и при отправке своей, и при приёме чужой.
    function applyReaction(
        from: string,
        nonce: string,
        emoji: string,
        remove: boolean
    ): void {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx === -1) {
            return;
        }
        const src = toRaw(messages.value[idx]).reactions ?? {};
        // Убираем этого человека из всех эмодзи (одна реакция на сообщение).
        const reactions: Record<string, string[]> = {};
        for (const [e, keys] of Object.entries(src)) {
            const kept = keys.filter((k) => k !== from);
            if (kept.length > 0) {
                reactions[e] = kept;
            }
        }
        if (!remove) {
            reactions[emoji] = [...(reactions[emoji] ?? []), from];
        }
        updateMessage(nonce, { reactions });
    }

    // Тоггл своей реакции: определяет текущее состояние, применяет локально и
    // возвращает, была ли реакция снята (для отправки экшена).
    function toggleReaction(
        nonce: string,
        emoji: string,
        myKey: string
    ): boolean {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        if (idx === -1) {
            return false;
        }
        const has = (messages.value[idx].reactions?.[emoji] ?? []).includes(
            myKey
        );
        applyReaction(myKey, nonce, emoji, has);
        return has;
    }

    // Перечитывает закреплённые из IDB (по возрастанию времени).
    async function loadPinned(): Promise<void> {
        pinned.value = (await getPinned(chatId)).sort(
            (a, b) => a.timestamp - b.timestamp
        );
    }

    // Тоггл закрепления (локально). Работает и когда сообщение вне окна (напр.
    // открепление из панели): текущее состояние берём из окна или списка
    // закреплённых, персистим прямо в IDB, обновляем окно (если видно) и список.
    async function togglePin(nonce: string): Promise<void> {
        const idx = messages.value.findIndex((m) => m.nonce === nonce);
        const currentlyPinned =
            idx !== -1
                ? !!messages.value[idx].pinned
                : pinned.value.some((m) => m.nonce === nonce);
        const next = !currentlyPinned;
        if (idx !== -1) {
            messages.value[idx] = {
                ...toRaw(messages.value[idx]),
                pinned: next,
            };
        }
        await setPinned(nonce, next);
        await loadPinned();
    }

    // --- Загрузка/пагинация/прыжок (всё из локального IDB) ---

    // Открывает окно на последних сообщениях; возвращает серверный seq-курсор
    // (для open_chat). Сбрасывает исторический режим.
    async function loadLastPage(): Promise<number> {
        hasMoreBelow.value = false;
        const cached = await getLastPage(chatId);
        messages.value = await decryptPage(cached);
        cached.forEach((m) => seenNonces.add(m.nonce));
        hasMoreMessages.value = cached.length >= PAGE_SIZE;
        return cached.reduce((max, m) => Math.max(max, m.seq ?? 0), 0);
    }

    async function loadMoreMessages(): Promise<void> {
        if (!hasMoreMessages.value || messages.value.length === 0) {
            return;
        }
        const oldestTimestamp = messages.value[0].timestamp;
        const older = await getPageBefore(chatId, oldestTimestamp);
        if (older.length < PAGE_SIZE) {
            hasMoreMessages.value = false;
        }
        if (older.length === 0) {
            return;
        }
        // Виртуализация (virtua) рендерит только видимые строки — полное окно
        // держать в DOM не нужно, поэтому prepend без обрезки хвоста.
        messages.value = [...(await decryptPage(older)), ...messages.value];
    }

    // Подгрузка вниз (новее последнего в окне) — при скролле из истории к концу.
    async function loadMoreBelow(): Promise<void> {
        if (!hasMoreBelow.value || messages.value.length === 0) {
            return;
        }
        const lastTs = messages.value[messages.value.length - 1].timestamp;
        const newer = await getPageAfter(chatId, lastTs);
        // Меньше полной страницы ⇒ достигли конца.
        if (newer.length < PAGE_SIZE) {
            hasMoreBelow.value = false;
        }
        if (newer.length === 0) {
            return;
        }
        messages.value = [...messages.value, ...(await decryptPage(newer))];
    }

    // Прыжок по дате: заменяем окно на срез с этого дня и скроллим к первому
    // сообщению дня.
    async function jumpToDate(ts: number): Promise<void> {
        const page = await getPageFromDate(chatId, startOfDay(ts));
        if (page.length === 0) {
            return jumpToLatest();
        }
        const decrypted = await decryptPage(page);
        messages.value = decrypted;
        page.forEach((m) => seenNonces.add(m.nonce));

        // Полная страница ⇒ вероятно есть новее (иначе окно достаёт до конца).
        hasMoreBelow.value = page.length === PAGE_SIZE;
        const earlier = await getPageBefore(chatId, page[0].timestamp);
        hasMoreMessages.value = earlier.length > 0;

        scrollTarget.value = { nonce: decrypted[0].nonce };
    }

    // Возврат к настоящему: перезагружаем последнюю страницу и скроллим вниз.
    async function jumpToLatest(): Promise<void> {
        const page = await getLastPage(chatId);
        messages.value = await decryptPage(page);
        page.forEach((m) => seenNonces.add(m.nonce));
        hasMoreMessages.value = page.length >= PAGE_SIZE;
        hasMoreBelow.value = false;
        scrollTarget.value = "bottom";
    }

    // Прыжок к конкретному сообщению (напр. из цитаты/закреплённого): грузим окно
    // вокруг него и центрируем.
    async function jumpToMessage(target: {
        nonce: string;
        timestamp: number;
    }): Promise<void> {
        // Уже в окне — просто прокручиваем (плавно, без перезагрузки).
        if (messages.value.some((m) => m.nonce === target.nonce)) {
            scrollTarget.value = {
                nonce: target.nonce,
                align: "center",
                smooth: true,
            };
            return;
        }
        const page = await getPageFromDate(chatId, target.timestamp);
        if (page.length === 0) {
            return;
        }
        messages.value = await decryptPage(page);
        page.forEach((m) => seenNonces.add(m.nonce));
        hasMoreBelow.value = page.length === PAGE_SIZE;
        const earlier = await getPageBefore(chatId, target.timestamp);
        hasMoreMessages.value = earlier.length > 0;
        scrollTarget.value = { nonce: target.nonce, align: "center" };
    }

    function messageDays() {
        return getMessageDays(chatId);
    }

    return {
        messages,
        hasMoreMessages,
        hasMoreBelow,
        scrollTarget,
        pinned,
        markSeen,
        hasSeen,
        addMessage,
        pushTransient,
        updateMessage,
        applyEdit,
        removeFromUI,
        removeMessage,
        applyReaction,
        toggleReaction,
        togglePin,
        loadPinned,
        loadLastPage,
        loadMoreMessages,
        loadMoreBelow,
        jumpToDate,
        jumpToLatest,
        jumpToMessage,
        messageDays,
    };
}
