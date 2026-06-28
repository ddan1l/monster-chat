import { ref, onMounted } from "vue";

import { useRegisterSW } from "virtual:pwa-register/vue";

const isPwa = ref(false);

export function usePwa() {
    useRegisterSW({ immediate: true });

    onMounted(() => {
        isPwa.value =
            window.matchMedia("(display-mode: standalone)").matches ||
            ("standalone" in window.navigator &&
                (window.navigator as { standalone?: boolean }).standalone ===
                    true);
    });

    return { isPwa };
}
