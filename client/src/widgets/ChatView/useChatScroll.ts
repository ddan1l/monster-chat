import { nextTick, onMounted, onUnmounted, watch } from "vue";
import type { Ref } from "vue";

import type { DecryptedMessage } from "@features/send-message/useChatSession";

import type { PeerInfo } from "shared";

export function useChatScroll(
    listEl: Ref<HTMLElement | null>,
    messages: () => DecryptedMessage[],
    peer: () => PeerInfo | null,
    isPeerTyping: () => boolean,
    onRead: (nonce: string) => void,
    onLoadMore: () => Promise<void>
) {
    const observedNonces = new Set<string>();
    let observer: IntersectionObserver | null = null;
    let initialScrollDone = false;
    let loadingMore = false;

    function scrollToBottom(smooth = false) {
        if (!listEl.value) return;
        if (smooth) {
            listEl.value.scrollTo({ top: listEl.value.scrollHeight });
        } else {
            listEl.value.scrollTop = listEl.value.scrollHeight;
        }
    }

    function isNearBottom() {
        if (!listEl.value) return true;
        const { scrollTop, scrollHeight, clientHeight } = listEl.value;
        return scrollHeight - scrollTop - clientHeight < 100;
    }

    function observePendingMessages() {
        if (!observer || !peer() || !listEl.value) return;
        for (const msg of messages()) {
            if (
                msg.from !== peer()!.signPubKey ||
                msg.isRead ||
                observedNonces.has(msg.nonce)
            )
                continue;
            const el = listEl.value.querySelector<HTMLElement>(
                `[data-nonce="${msg.nonce}"]`
            );
            if (el) {
                observedNonces.add(msg.nonce);
                observer.observe(el);
            }
        }
    }

    async function onScroll() {
        if (!listEl.value || loadingMore) return;
        if (listEl.value.scrollTop < 300) {
            loadingMore = true;
            const prevScrollTop = listEl.value.scrollTop;
            const prevHeight = listEl.value.scrollHeight;
            await onLoadMore();
            await nextTick();
            requestAnimationFrame(() => {
                if (!listEl.value) return;
                const delta = listEl.value.scrollHeight - prevHeight;
                listEl.value.scrollTop = prevScrollTop + delta;
                loadingMore = false;
            });
        }
    }

    onMounted(() => {
        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const nonce = (entry.target as HTMLElement).dataset.nonce!;
                observer!.unobserve(entry.target);
                onRead(nonce);
            }
        });
        listEl.value?.addEventListener("scroll", onScroll, { passive: true });
    });

    onUnmounted(() => {
        observer?.disconnect();
        listEl.value?.removeEventListener("scroll", onScroll);
    });

    watch(
        () => messages().length,
        async (newLen, oldLen) => {
            await nextTick();
            observePendingMessages();
            if (loadingMore) return;
            if (!initialScrollDone && newLen > 0) {
                initialScrollDone = true;
                scrollToBottom();
            } else if (newLen > (oldLen ?? 0) && isNearBottom()) {
                scrollToBottom(true);
            }
        }
    );

    watch(
        () => peer(),
        async () => {
            await nextTick();
            observePendingMessages();
        }
    );

    watch(
        () => isPeerTyping(),
        async (val) => {
            if (val && isNearBottom()) {
                await nextTick();
                scrollToBottom(true);
            }
        }
    );
}
