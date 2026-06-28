import { useRegisterSW } from "virtual:pwa-register/vue";

export function usePushNotifications() {
    useRegisterSW({ immediate: true });
}

export async function subscribePush(signPubKey: string): Promise<void> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const res = await fetch("/api/push/vapid-public-key");
    if (!res.ok) return;
    const { key } = (await res.json()) as { key: string };

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const subscription =
        existing ??
        (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(key),
        }));

    await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signPubKey, subscription }),
    });
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr.buffer;
}
