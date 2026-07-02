import { ref } from "vue";

import { isTauri } from "./useTauri";

const updateAvailable = ref(false);
let pendingUpdate: { downloadAndInstall: () => Promise<void> } | null = null;

export async function checkForUpdates(): Promise<void> {
    if (!isTauri) return;
    try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update?.available) {
            pendingUpdate = update;
            updateAvailable.value = true;
        }
    } catch {
        // ignore — no network or no endpoint configured
    }
}

export async function installUpdate(): Promise<void> {
    if (!pendingUpdate) return;
    await pendingUpdate.downloadAndInstall();
}

export function useUpdater() {
    return { updateAvailable, installUpdate };
}
