import { usePermissions } from "./usePermissions";
import { useVisibility } from "./useVisibility";

const { isGranted } = usePermissions("notifications");
const { isVisible } = useVisibility();

export function useNotifications() {
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
