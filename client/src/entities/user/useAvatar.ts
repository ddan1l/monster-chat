import type { Component } from "vue";

import { isTauri } from "@shared/lib/useTauri";

const urlModules = import.meta.glob("/src/shared/ui/icons/avatars/*.svg", {
    eager: true,
    query: "?url",
    import: "default",
});

const rawModules = import.meta.glob("/src/shared/ui/icons/avatars/*.svg", {
    eager: true,
    query: "?raw",
    import: "default",
});

const componentModules = import.meta.glob(
    "/src/shared/ui/icons/avatars/*.svg",
    {
        eager: true,
        query: "?component",
        import: "default",
    }
);

export function avatarUrl(key: string): string | undefined {
    return urlModules[key] as string | undefined;
}

function renderAvatarCanvas(key: string): Promise<string | undefined> {
    const acid = getComputedStyle(document.documentElement)
        .getPropertyValue("--mc-acid")
        .trim();

    const svgText = rawModules[key] as string | undefined;
    if (!svgText) return Promise.resolve(undefined);

    const colored = svgText
        .replace(/var\(--mc-acid\)/g, acid || "#c6ff3a")
        .replace(/currentColor/g, "#050706");
    const dataUrl =
        "data:image/svg+xml;base64," +
        btoa(unescape(encodeURIComponent(colored)));

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const size = 192;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = acid || "#c6ff3a";
            ctx.fillRect(0, 0, size, size);
            const padding = size * 0.1;
            ctx.drawImage(
                img,
                padding,
                padding,
                size - padding * 2,
                size - padding * 2
            );
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => resolve(undefined);
        img.src = dataUrl;
    });
}

async function saveAvatarToTemp(key: string): Promise<string | undefined> {
    const dataUrl = await renderAvatarCanvas(key);
    if (!dataUrl) return undefined;

    const base64 = dataUrl.split(",")[1];
    const { tempDir } = await import("@tauri-apps/api/path");
    const { writeFile } = await import("@tauri-apps/plugin-fs");

    const name = key.split("/").pop()?.replace(".svg", ".png") ?? "avatar.png";
    const path = `${await tempDir()}mc_avatar_${name}`;

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    await writeFile(path, bytes);
    return path;
}

export async function avatarIconUrl(key: string): Promise<string | undefined> {
    if (isTauri) {
        return saveAvatarToTemp(key);
    }
    return renderAvatarCanvas(key);
}

export function avatarComponent(key: string): Component | undefined {
    return componentModules[key] as Component | undefined;
}
