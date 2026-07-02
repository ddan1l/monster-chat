import { isTauri } from "./useTauri";
import {
    requestTauriNotificationPermission,
    useTauriNotifications,
} from "./useTauriNotifications";
import {
    requestWebNotificationPermission,
    useWebNotifications,
} from "./useWebNotifications";

export async function requestNotificationPermission(): Promise<void> {
    if (isTauri) {
        await requestTauriNotificationPermission();
    } else {
        await requestWebNotificationPermission();
    }
}

export function useNotifications() {
    const tauri = isTauri ? useTauriNotifications() : null;
    const web = !isTauri ? useWebNotifications() : null;

    async function notify(
        title: string,
        options?: { body?: string; icon?: string; data?: unknown }
    ): Promise<void> {
        if (tauri) {
            await tauri.notify(title, options);
        } else {
            await web!.notify(title, options);
        }
    }

    return { notify };
}
