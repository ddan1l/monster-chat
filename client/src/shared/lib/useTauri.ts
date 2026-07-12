import { useDevice } from "./useDevice";

export const isTauri = "__TAURI_INTERNALS__" in window;

const { isWindows, isMac } = useDevice();
export const canInstallApp = !isTauri && (isWindows || isMac);

// Явный выбор «работать в браузере» (через /app/web) — отключает редирект
// на страницу установки приложения.
const FORCE_WEB_KEY = "mc-force-web";

export function isForceWeb(): boolean {
    return localStorage.getItem(FORCE_WEB_KEY) === "1";
}

export function setForceWeb(): void {
    localStorage.setItem(FORCE_WEB_KEY, "1");
}
