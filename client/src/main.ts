import { createApp } from "vue";
import App from "@app/App.vue";
import router from "@app/router";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/geist-mono/400.css";
import "@shared/ui/styles/reset.scss";
import "@shared/ui/styles/tokens.scss";
import "@shared/ui/styles/global.scss";

createApp(App).use(router).mount("#app");
