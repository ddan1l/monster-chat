import { ref, onMounted, onUnmounted } from "vue";

export function useDragScroll() {
    const elRef = ref<HTMLElement | null>(null);
    const hasOverflow = ref(false);

    let dragStart = 0;
    let scrollStart = 0;
    let dragging = false;
    let ro: ResizeObserver | null = null;

    function checkOverflow() {
        if (!elRef.value) return;
        hasOverflow.value = elRef.value.scrollWidth > elRef.value.clientWidth;
    }

    onMounted(() => {
        if (!elRef.value) return;
        ro = new ResizeObserver(checkOverflow);
        ro.observe(elRef.value);
        checkOverflow();
    });

    onUnmounted(() => ro?.disconnect());

    function onMouseDown(e: MouseEvent) {
        if (!elRef.value || !hasOverflow.value) return;
        dragging = true;
        dragStart = e.clientX;
        scrollStart = elRef.value.scrollLeft;
    }

    function onMouseMove(e: MouseEvent) {
        if (!dragging || !elRef.value) return;
        elRef.value.scrollLeft = scrollStart - (e.clientX - dragStart);
    }

    function onMouseUp() {
        dragging = false;
    }

    return { elRef, hasOverflow, onMouseDown, onMouseMove, onMouseUp };
}
