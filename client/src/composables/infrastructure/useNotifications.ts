import { usePermissions } from "./usePermissions";
import { useVisibility } from "./useVisibility";

const { isGranted } = usePermissions("notifications");
const { isVisible } = useVisibility();

export function useNotifications() {
    function notify(title: string) {
        if (isGranted.value && !isVisible.value) {
            new Notification(title);
        }
    }

    return { notify };
}
