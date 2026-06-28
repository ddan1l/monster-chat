import { execSync } from "node:child_process";
import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgLoader from "vite-svg-loader";

const appVersion = execSync("git rev-parse --short HEAD").toString().trim();

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(appVersion),
    },
    plugins: [
        vue(),
        svgLoader(),
        VitePWA({
            strategies: "injectManifest",
            srcDir: "src",
            filename: "sw.ts",
            registerType: "autoUpdate",
            includeAssets: ["favicon.png", "icon.svg"],
            manifest: {
                name: "Monster Chat",
                short_name: "Monster",
                description: "End-to-end encrypted p2p messenger",
                theme_color: "#0f120f",
                background_color: "#0f120f",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            injectManifest: {
                globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
                rollupFormat: "es",
                target: "esnext",
            },
            devOptions: {
                enabled: true,
                type: "module",
            },
        }),
    ],
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
