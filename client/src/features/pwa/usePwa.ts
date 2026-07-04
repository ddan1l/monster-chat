import { ref, onMounted } from "vue";

import { isTauri } from "@shared/lib/useTauri";

const isPwa = ref(false);

export function usePwa() {
    if (!isTauri) {
        import("virtual:pwa-register/vue").then(({ useRegisterSW }) => {
            useRegisterSW({ immediate: true });
        });
    }

    onMounted(() => {
        isPwa.value =
            window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in window.navigator &&
                (window.navigator as { standalone?: boolean }).standalone ===
                    true);
    });

    return { isPwa };
}
