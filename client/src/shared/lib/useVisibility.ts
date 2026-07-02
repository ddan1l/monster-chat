import { ref } from "vue";

import { useWs } from "@shared/api/useWs";

import { isTauri } from "./useTauri";

const isVisible = ref(!document.hidden);

if (isTauri) {
    import("@tauri-apps/api/event").then(({ listen }) => {
        listen("tauri://blur", () => {
            isVisible.value = false;
            useWs().send({ type: "set_away" });
        });
        listen("tauri://focus", () => {
            isVisible.value = true;
            useWs().send({ type: "set_online" });
        });
    });
} else {
    document.addEventListener("visibilitychange", () => {
        isVisible.value = !document.hidden;
    });
}

export function useVisibility() {
    return { isVisible };
}
