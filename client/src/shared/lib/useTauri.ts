import { useDevice } from "./useDevice";

export const isTauri = "__TAURI_INTERNALS__" in window;

const { isWindows, isMac } = useDevice();
export const canInstallApp = !isTauri && (isWindows || isMac);
