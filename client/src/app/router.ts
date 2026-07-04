import { createRouter, createWebHistory } from "vue-router";

import { useCrypto } from "@shared/crypto/useCrypto";
import { isTauri } from "@shared/lib/useTauri";

import { useUser } from "@entities/user/useUser";

import { useAuth } from "@features/auth/useAuth";

import ApprovePage from "@pages/ApprovePage.vue";
import InboxPage from "@pages/InboxPage.vue";
import LandingPage from "@pages/LandingPage.vue";
import OpenPage from "@pages/OpenPage.vue";
import SettingsPage from "@pages/SettingsPage.vue";
import SetupPage from "@pages/SetupPage.vue";
import UnlockPage from "@pages/UnlockPage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: LandingPage },
        { path: "/open", component: OpenPage },
        { path: "/app", component: InboxPage },
        { path: "/app/chat/:chatId", component: InboxPage },
        { path: "/app/setup", component: SetupPage },
        { path: "/app/unlock", component: UnlockPage },
        { path: "/app/join/:chatId", component: ApprovePage },
        { path: "/app/settings", component: SettingsPage },
    ],
});

router.beforeEach(async (to) => {
    if (!to.path.startsWith("/app")) return true;

    const { canInstallApp } = await import("@shared/lib/useTauri");
    if (canInstallApp && !isTauri) {
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
