import { createRouter, createWebHistory } from "vue-router";
import { useCrypto } from "./composables/useCrypto";
import { useUser } from "./composables/useUser";

import InboxPage from "./pages/InboxPage.vue";
import SetupPage from "./pages/SetupPage.vue";
import ApprovePage from "./pages/ApprovePage.vue";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: InboxPage },
        { path: "/chat/:chatId", component: InboxPage },
        { path: "/setup", component: SetupPage },
        { path: "/join/:chatId", component: ApprovePage },
    ],
});

router.beforeEach(async (to) => {
    if (to.path === "/setup") {
        return true;
    }

    const [hasKeys, hasUser] = await Promise.all([
        useCrypto().hasKeys(),
        useUser().hasUser(),
    ]);

    if (!hasKeys || !hasUser) {
        return "/setup";
    }
});

export default router;
