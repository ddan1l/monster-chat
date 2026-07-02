import { invoke } from "@tauri-apps/api/core";
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";

export async function requestTauriNotificationPermission(): Promise<void> {
    const granted = await isPermissionGranted();
    if (!granted) await requestPermission();
}

export function useTauriNotifications() {
    async function notify(
        title: string,
        options?: { body?: string; icon?: string; data?: unknown }
    ): Promise<void> {
        if (!(await isPermissionGranted())) return;

        const iconPath = options?.icon ? `file://${options.icon}` : undefined;

        sendNotification({
            title,
            body: options?.body,
            ...(iconPath
                ? { attachments: [{ id: "icon", url: iconPath }] }
                : {}),
        });

        await invoke("start_flash");
    }

    return { notify };
}
