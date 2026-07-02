import { ref, computed } from "vue";

import { isTauri } from "./useTauri";
import { requestTauriNotificationPermission } from "./useTauriNotifications";
import { requestWebNotificationPermission } from "./useWebNotifications";

function useTauriPermissions() {
    const status = ref<PermissionState>("prompt");
    const ready = ref(false);

    import("@tauri-apps/plugin-notification").then(
        ({ isPermissionGranted }) => {
            isPermissionGranted().then((granted) => {
                status.value = granted ? "granted" : "prompt";
                ready.value = true;
            });
        }
    );

    async function request(): Promise<void> {
        await requestTauriNotificationPermission();
        const { isPermissionGranted } =
            await import("@tauri-apps/plugin-notification");
        status.value = (await isPermissionGranted()) ? "granted" : "denied";
    }

    const isGranted = computed(() => status.value === "granted");
    return { status, ready, isGranted, request };
}

function useWebPermissions(name: PermissionName) {
    const status = ref<PermissionState>("prompt");
    const ready = ref(false);

    navigator.permissions
        .query({ name })
        .then((result) => {
            status.value = result.state;
            ready.value = true;
            result.addEventListener("change", () => {
                status.value = result.state;
            });
        })
        .catch(() => {
            ready.value = true;
        });

    async function request(): Promise<void> {
        if (name === "notifications") {
            await requestWebNotificationPermission();
        }
    }

    const isGranted = computed(() => status.value === "granted");
    return { status, ready, isGranted, request };
}

export function usePermissions(name: PermissionName) {
    if (isTauri && name === "notifications") {
        return useTauriPermissions();
    }
    return useWebPermissions(name);
}
