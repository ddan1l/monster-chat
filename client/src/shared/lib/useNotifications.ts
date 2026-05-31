import { usePermissions } from "./usePermissions";
import { useVisibility } from "./useVisibility";

let permissions: ReturnType<typeof usePermissions> | null = null;
let visibility: ReturnType<typeof useVisibility> | null = null;

export function useNotifications() {
    permissions ??= usePermissions("notifications");
    visibility ??= useVisibility();

    const { isGranted } = permissions;
    const { isVisible } = visibility;

    function notify(
        title: string,
        options?: NotificationOptions & { url?: string; renotify?: boolean }
    ) {
        if (isGranted.value && !isVisible.value) {
            const { url, ...notifOptions } = options ?? {};
            const n = new Notification(title, notifOptions);
            if (url) {
                n.onclick = () => {
                    window.focus();
                    window.location.href = url;
                };
            }
        }
    }

    return { notify };
}
