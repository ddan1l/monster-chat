import { ref } from "vue";

const isVisible = ref(!document.hidden);

document.addEventListener("visibilitychange", () => {
    isVisible.value = !document.hidden;
});

export function useVisibility() {
    return { isVisible };
}
