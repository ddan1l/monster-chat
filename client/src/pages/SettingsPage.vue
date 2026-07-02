<script setup lang="ts">
import { ref, onMounted } from "vue";

import { isTauri } from "@shared/lib/useTauri";

import {
    useSettings,
    type Theme,
    type Language,
} from "@entities/settings/useSettings";

const { settings, setTheme, setLanguage, setNotifications } = useSettings();

const autostartEnabled = ref(false);

onMounted(async () => {
    if (!isTauri) return;
    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    autostartEnabled.value = await isEnabled();
});

async function toggleAutostart(val: boolean) {
    const { enable, disable } = await import("@tauri-apps/plugin-autostart");
    if (val) {
        await enable();
    } else {
        await disable();
    }
    autostartEnabled.value = val;
}

const themes: { value: Theme; label: string }[] = [
    { value: "acid-green", label: "Acid Green" },
    { value: "kyber-blue", label: "Kyber Blue" },
    { value: "hot-magenta", label: "Hot Magenta" },
    { value: "amber", label: "Amber" },
];

const languages: { value: Language; label: string }[] = [
    { value: "ru", label: "Русский" },
    { value: "en", label: "English" },
];
</script>

<template>
    <div
        style="
            max-width: 480px;
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 32px;
        "
    >
        <h1 style="margin: 0">Настройки</h1>

        <!-- Theme -->
        <section style="display: flex; flex-direction: column; gap: 12px">
            <h2 style="margin: 0; font-size: 15px">Тема</h2>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
                <button
                    v-for="t in themes"
                    :key="t.value"
                    :style="{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border:
                            settings.theme === t.value
                                ? '2px solid var(--mc-acid)'
                                : '2px solid var(--mc-line)',
                        background:
                            settings.theme === t.value
                                ? 'var(--mc-bg-sel)'
                                : 'var(--mc-bg-card)',
                        color: 'var(--mc-fg)',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }"
                    @click="setTheme(t.value)"
                >
                    {{ t.label }}
                </button>
            </div>
        </section>

        <!-- Language -->
        <section style="display: flex; flex-direction: column; gap: 12px">
            <h2 style="margin: 0; font-size: 15px">Язык</h2>
            <div style="display: flex; gap: 8px">
                <button
                    v-for="l in languages"
                    :key="l.value"
                    :style="{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border:
                            settings.language === l.value
                                ? '2px solid var(--mc-acid)'
                                : '2px solid var(--mc-line)',
                        background:
                            settings.language === l.value
                                ? 'var(--mc-bg-sel)'
                                : 'var(--mc-bg-card)',
                        color: 'var(--mc-fg)',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }"
                    @click="setLanguage(l.value)"
                >
                    {{ l.label }}
                </button>
            </div>
        </section>

        <!-- Autostart -->
        <section
            v-if="isTauri"
            style="display: flex; flex-direction: column; gap: 12px"
        >
            <h2 style="margin: 0; font-size: 15px">Система</h2>
            <label
                style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                "
            >
                <input
                    type="checkbox"
                    :checked="autostartEnabled"
                    @change="
                        toggleAutostart(
                            ($event.target as HTMLInputElement).checked
                        )
                    "
                />
                <span style="font-size: 14px; color: var(--mc-fg)"
                    >Запускать при старте системы</span
                >
            </label>
        </section>

        <!-- Notifications -->
        <section style="display: flex; flex-direction: column; gap: 12px">
            <h2 style="margin: 0; font-size: 15px">Уведомления</h2>
            <label
                style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                "
            >
                <input
                    type="checkbox"
                    :checked="settings.notifications"
                    @change="
                        setNotifications(
                            ($event.target as HTMLInputElement).checked
                        )
                    "
                />
                <span style="font-size: 14px; color: var(--mc-fg)"
                    >Показывать уведомления</span
                >
            </label>
        </section>
    </div>
</template>
