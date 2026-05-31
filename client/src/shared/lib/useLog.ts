export function useLog(scope: string) {
    const prefix = `[${scope}]`;

    return {
        info: (...args: unknown[]) => console.info(prefix, ...args),
        warn: (...args: unknown[]) => console.warn(prefix, ...args),
        error: (...args: unknown[]) => console.error(prefix, ...args),
    };
}
