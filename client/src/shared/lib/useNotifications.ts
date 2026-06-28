export function useNotifications() {
    async function notify(
        title: string,
        options?: { body?: string; icon?: string; data?: unknown }
    ): Promise<void> {
        if (Notification.permission !== "granted") return;
        const reg = await navigator.serviceWorker?.ready;
        await reg?.showNotification(title, {
            body: options?.body,
            icon: options?.icon ?? "/icon-192.png",
            data: options?.data,
        });
    }

    return { notify };
}
