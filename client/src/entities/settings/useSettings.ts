import { ref, watch } from "vue";

export type Theme = "acid-green" | "kyber-blue" | "hot-magenta" | "amber";
export type Language = "ru" | "en";
export type ChatWallpaper = "base" | "grid" | "dots";

// Обои ленты чата — нейтральные (без acid-акцента), как в ТГ. Осветление —
// нейтрально-серым (mix с #7f7f7f), линии/точки — белым с низкой альфой поверх
// --mc-bg-chat. css применяется как background на общем контейнере
// сообщений+редактора (.chat-view__body) и как превью в настройках. Порядок
// массива = порядок в пикере.
export const chatWallpapers: {
    id: ChatWallpaper;
    label: string;
    css: string;
}[] = [
    // Базовый — просто плоский фон темы (без узора и градиента).
    { id: "base", label: "Базовый", css: "var(--mc-bg-chat)" },
    {
        id: "grid",
        label: "Сетка",
        css: `
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px) 0 0 / 100% 32px,
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px) 0 0 / 32px 100%,
            var(--mc-bg-chat)`,
    },
    {
        id: "dots",
        label: "Точки",
        css: `
            radial-gradient(rgba(255, 255, 255, 0.06) 1.5px, transparent 1.6px) 0 0 / 22px 22px,
            var(--mc-bg-chat)`,
    },
];

export function wallpaperCss(id: ChatWallpaper): string {
    return chatWallpapers.find((w) => w.id === id)?.css ?? "var(--mc-bg-chat)";
}

interface Settings {
    theme: Theme;
    language: Language;
    notifications: boolean;
    chatWallpaper: ChatWallpaper;
}

const STORAGE_KEY = "mc_settings";

function load(): Settings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return { ...defaults(), ...JSON.parse(raw) };
        }
    } catch {
        /* empty */
    }
    return defaults();
}

function defaults(): Settings {
    return {
        theme: "acid-green",
        language: "ru",
        notifications: true,
        chatWallpaper: "base",
    };
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

    function setChatWallpaper(wallpaper: ChatWallpaper) {
        settings.value.chatWallpaper = wallpaper;
    }

    return {
        settings,
        setTheme,
        setLanguage,
        setNotifications,
        setChatWallpaper,
    };
}
