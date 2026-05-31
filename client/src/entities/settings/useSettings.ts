import { ref, watch } from "vue";

export type Theme = "acid-green" | "kyber-blue" | "hot-magenta" | "amber";
export type Language = "ru" | "en";

interface Settings {
    theme: Theme;
    language: Language;
    notifications: boolean;
}

const STORAGE_KEY = "mc_settings";

function load(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...defaults(), ...JSON.parse(raw) };
    } catch {
        /* empty */
    }
    return defaults();
}

function defaults(): Settings {
    return { theme: "acid-green", language: "ru", notifications: true };
}

const settings = ref<Settings>(load());

watch(
    settings,
    (val) => localStorage.setItem(STORAGE_KEY, JSON.stringify(val)),
    { deep: true }
);

watch(
    () => settings.value.theme,
    (theme) => {
        if (theme === "acid-green") {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", theme);
        }
    },
    { immediate: true }
);

export function useSettings() {
    function setTheme(theme: Theme) {
        settings.value.theme = theme;
    }

    function setLanguage(language: Language) {
        settings.value.language = language;
    }

    function setNotifications(enabled: boolean) {
        settings.value.notifications = enabled;
    }

    return { settings, setTheme, setLanguage, setNotifications };
}
