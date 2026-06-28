import type { Component } from "vue";

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

export async function avatarIconUrl(key: string): Promise<string | undefined> {
    const acid = getComputedStyle(document.documentElement)
        .getPropertyValue("--mc-acid")
        .trim();

    const svgText = rawModules[key] as string | undefined;
    if (!svgText) return undefined;

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

export function avatarComponent(key: string): Component | undefined {
    return componentModules[key] as Component | undefined;
}
