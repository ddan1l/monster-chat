const modules = import.meta.glob("/src/shared/ui/icons/avatars/*.svg", {
    query: "?url",
    import: "default",
    eager: true,
});

export function avatarUrl(avatarKey: string): string | undefined {
    return modules[avatarKey] as string | undefined;
}
