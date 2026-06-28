/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("push", (event) => {
    let data: { title?: string; body?: string; chatId?: string } = {};
    try {
        data = event.data?.json() ?? {};
    } catch {
        data = { body: event.data?.text() };
    }
    event.waitUntil(
        self.registration.showNotification(data.title ?? "Monster Chat", {
            body: data.body ?? "Новое сообщение",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: { chatId: data.chatId },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const chatId = event.notification.data?.chatId;
    const url = chatId ? `/chat/${chatId}` : "/";
    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    clientList[0].focus();
                    clientList[0].navigate(url);
                } else {
                    self.clients.openWindow(url);
                }
            })
    );
});
