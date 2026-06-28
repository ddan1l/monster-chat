import type { Component } from "vue";

const urlModules = import.meta.glob("/src/shared/ui/icons/avatars/*.svg", {
    eager: true,
    query: "?url",
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

export function avatarComponent(key: string): Component | undefined {
    return componentModules[key] as Component | undefined;
}
