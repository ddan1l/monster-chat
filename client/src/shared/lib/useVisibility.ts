import { ref } from "vue";

import { isTauri } from "./useTauri";

const isVisible = ref(!document.hidden);

if (isTauri) {
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
        const win = getCurrentWindow();
        win.onFocusChanged(({ payload: focused }) => {
            if (focused) isVisible.value = true;
        });
        // document.hidden не отражает window.hide() в Tauri —
        // слушаем нативные события видимости окна
        import("@tauri-apps/api/event").then(({ listen }) => {
            listen("tauri://blur", () => {
                isVisible.value = false;
            });
            listen("tauri://focus", () => {
                isVisible.value = true;
            });
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
