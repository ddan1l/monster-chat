import { createRouter, createWebHistory } from "vue-router";
import { useAuth } from "./composables/crypto/useAuth";
import { useCrypto } from "./composables/crypto/useCrypto";
import { useUser } from "./composables/user/useUser";

import InboxPage from "./pages/InboxPage.vue";
import SetupPage from "./pages/SetupPage.vue";
import UnlockPage from "./pages/UnlockPage.vue";
import ApprovePage from "./pages/ApprovePage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: InboxPage },
        { path: "/chat/:chatId", component: InboxPage },
        { path: "/setup", component: SetupPage },
        { path: "/unlock", component: UnlockPage },
        { path: "/join/:chatId", component: ApprovePage },
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
