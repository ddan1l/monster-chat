import { createRouter, createWebHistory } from "vue-router";

import { useCrypto } from "@shared/crypto/useCrypto";

import { useUser } from "@entities/user/useUser";

import { useAuth } from "@features/auth/useAuth";

import ApprovePage from "@pages/ApprovePage.vue";
import InboxPage from "@pages/InboxPage.vue";
import SettingsPage from "@pages/SettingsPage.vue";
import SetupPage from "@pages/SetupPage.vue";
import UnlockPage from "@pages/UnlockPage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: InboxPage },
        { path: "/chat/:chatId", component: InboxPage },
        { path: "/setup", component: SetupPage },
        { path: "/unlock", component: UnlockPage },
        { path: "/join/:chatId", component: ApprovePage },
        { path: "/settings", component: SettingsPage },
    ],
});

router.beforeEach(async (to) => {
    if (to.path === "/setup" || to.path === "/unlock") {
        return true;
    }

    const [hasKeys, hasUser] = await Promise.all([
        useAuth().hasKeys(),
        useUser().hasUser(),
    ]);

    if (!hasKeys || !hasUser) {
        return "/setup";
    }

    const { encryptionKeyPair } = useCrypto();
    if (!encryptionKeyPair.value) {
        const restored = await useAuth().restoreFromSession();
        if (!restored) return "/unlock";
    }
});

export default router;
