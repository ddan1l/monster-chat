import { createRouter, createWebHistory } from "vue-router";

import { useCrypto } from "@shared/crypto/useCrypto";
import { isTauri, setForceWeb } from "@shared/lib/useTauri";

import { useUser } from "@entities/user/useUser";

import { useAuth } from "@features/auth/useAuth";

import ApprovePage from "@pages/ApprovePage.vue";
import InboxPage from "@pages/InboxPage.vue";
import LandingPage from "@pages/LandingPage.vue";
import OpenPage from "@pages/OpenPage.vue";
import SetupPage from "@pages/SetupPage.vue";
import UnlockPage from "@pages/UnlockPage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "landing", component: LandingPage },
        { path: "/open", name: "open", component: OpenPage },
        {
            path: "/app",
            name: "inbox",
            component: InboxPage,
            meta: { index: 0 },
        },
        {
            path: "/app/chat/:chatId",
            name: "chat",
            component: InboxPage,
            meta: { index: 0 },
        },
        {
            path: "/app/web",
            name: "web",
            redirect: (to) => {
                // Явный вход в веб-версию: запоминаем выбор и идём к цели
                // (?to=/app/join/... сохраняет диплинк) либо в /app.
                setForceWeb();
                return (to.query.to as string) ?? "/app";
            },
        },
        { path: "/app/setup", name: "setup", component: SetupPage },
        { path: "/app/unlock", name: "unlock", component: UnlockPage },
        { path: "/app/join/:chatId", name: "join", component: ApprovePage },
    ],
});

router.beforeEach(async (to) => {
    if (to.path === "/" && isTauri) return "/app";

    if (!to.path.startsWith("/app")) return true;

    const { canInstallApp, isForceWeb } = await import("@shared/lib/useTauri");
    if (canInstallApp && !isTauri && !isForceWeb()) {
        return { path: "/open", query: { to: to.fullPath } };
    }

    if (to.path === "/app/setup" || to.path === "/app/unlock") return true;

    const [hasKeys, hasUser] = await Promise.all([
        useAuth().hasKeys(),
        useUser().hasUser(),
    ]);

    if (!hasKeys || !hasUser) {
        return "/app/setup";
    }

    const { encryptionKeyPair } = useCrypto();
    if (!encryptionKeyPair.value) {
        const restored = await useAuth().restoreFromSession();
        if (!restored) {
            return { path: "/app/unlock", query: { redirect: to.fullPath } };
        }
    }
});

export default router;
