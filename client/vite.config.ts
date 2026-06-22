import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import svgLoader from "vite-svg-loader";

import { version } from "./package.json";

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
    },
    plugins: [vue(), svgLoader()],
    resolve: {
        alias: {
            "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
            "@entities": fileURLToPath(
                new URL("./src/entities", import.meta.url)
            ),
            "@features": fileURLToPath(
                new URL("./src/features", import.meta.url)
            ),
            "@widgets": fileURLToPath(
                new URL("./src/widgets", import.meta.url)
            ),
            "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
            "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
        },
        headers: {
            "Content-Security-Policy": [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",
                "style-src 'self' 'unsafe-inline'",
                "connect-src 'self' ws://localhost:* wss:",
                "img-src 'self' data:",
                "object-src 'none'",
                "base-uri 'self'",
                "frame-ancestors 'none'",
            ].join("; "),
        },
    },
});
