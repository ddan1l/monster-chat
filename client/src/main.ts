import { createApp } from "vue";

import App from "@app/App.vue";
import router from "@app/router";
import "@fontsource-variable/onest";
import "@fontsource/geist-mono/400.css";
import "@shared/ui/styles/reset.scss";
import "@shared/ui/styles/tokens.scss";
import "@shared/ui/styles/global.scss";

// Глушим нативное контекстное меню браузера; свои меню вешаем точечно.
document.addEventListener("contextmenu", (e) => e.preventDefault());

createApp(App).use(router).mount("#app");
