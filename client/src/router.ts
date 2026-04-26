import { createRouter, createWebHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import SetupPage from "./pages/SetupPage.vue";
import { useCrypto } from "./composables/useCrypto";
import { useUser } from "./composables/useUser";

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", component: HomePage },
        { path: "/chat/:chatId", component: HomePage },
        { path: "/setup", component: SetupPage },
    ],
});

router.beforeEach(async (to) => {
    if (to.path === "/setup") return true;
    const [hasKeys, hasUser] = await Promise.all([
        useCrypto().hasKeys(),
        useUser().hasUser(),
    ]);
    if (!hasKeys || !hasUser) return "/setup";
});

export default router;
