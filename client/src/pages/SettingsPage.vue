<script setup lang="ts">
import { ref, onMounted } from "vue";

import { isTauri } from "@shared/lib/useTauri";
import QrCode from "@shared/ui/components/QrCode.vue";

import {
    useSettings,
    type Theme,
    type Language,
} from "@entities/settings/useSettings";

import { useLinking } from "@features/auth/useLinking";

const { settings, setTheme, setLanguage, setNotifications } = useSettings();
const { exportBundle } = useLinking();

const confirmDelete = ref(false);

const linkTransfer = ref<string | null>(null);
const linkCode = ref<string | null>(null);
const linkLoading = ref(false);

async function generateLink() {
    linkLoading.value = true;
    try {
        const { transfer, code } = await exportBundle();
        linkTransfer.value = transfer;
        linkCode.value = code;
    } finally {
        linkLoading.value = false;
    }
}

async function deleteAllData() {
    localStorage.clear();
    const { deleteDb } = await import("@shared/storage/useIndexedDb");
    await deleteDb();
    location.reload();
}

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
    { value: "acid-green", label: "Токсичный компромисс" },
    { value: "kyber-blue", label: "Ночной океан" },
    { value: "hot-magenta", label: "Сахарная вата" },
    { value: "amber", label: "Медовая ловушка" },
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

        <!-- Devices / linking -->
        <section style="display: flex; flex-direction: column; gap: 12px">
            <h2 style="margin: 0; font-size: 15px">Устройства</h2>
            <p style="font-size: 12px; color: var(--mc-fg-mute); margin: 0">
                Привяжите второе устройство к этому аккаунту. Код одноразовый —
                не передавайте строку и код никому.
            </p>
            <div v-if="!linkTransfer" style="display: flex">
                <button
                    :disabled="linkLoading"
                    :style="{
                        padding: '8px 16px',
                        border: '2px solid var(--mc-acid)',
                        background: 'transparent',
                        color: 'var(--mc-acid)',
                        cursor: 'pointer',
                        fontSize: '13px',
                    }"
                    @click="generateLink"
                >
                    {{ linkLoading ? "..." : "Привязать устройство" }}
                </button>
            </div>
            <div v-else style="display: flex; flex-direction: column; gap: 8px">
                <span style="font-size: 13px; color: var(--mc-fg)">
                    Код:
                    <strong
                        style="
                            font-family: var(--mc-mono);
                            letter-spacing: 0.12em;
                        "
                        >{{ linkCode }}</strong
                    >
                </span>
                <!-- QR со строкой переноса — отсканировать на новом устройстве.
                     Код вводится отдельно (не в QR). -->
                <QrCode :data="linkTransfer" :size="220" />
                <span style="font-size: 12px; color: var(--mc-fg-mute)">
                    Отсканируйте QR на новом устройстве и введите код. Или
                    скопируйте строку ниже.
                </span>
                <textarea
                    :value="linkTransfer"
                    readonly
                    rows="4"
                    style="
                        width: 100%;
                        box-sizing: border-box;
                        font-family: monospace;
                        font-size: 11px;
                    "
                    @focus="($event.target as HTMLTextAreaElement).select()"
                />
                <span style="font-size: 12px; color: var(--mc-fg-mute)">
                    На новом устройстве: «Уже есть аккаунт? Привязать это
                    устройство» → вставьте строку и код.
                </span>
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

        <!-- Delete all data -->
        <section style="display: flex; flex-direction: column; gap: 12px">
            <h2 style="margin: 0; font-size: 15px">Опасная зона</h2>
            <div v-if="!confirmDelete" style="display: flex">
                <button
                    :style="{
                        padding: '8px 16px',
                        border: '2px solid var(--mc-danger)',
                        background: 'transparent',
                        color: 'var(--mc-danger)',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontFamily: 'var(--mc-mono)',
                        fontWeight: '700',
                        letterSpacing: '0.04em',
                    }"
                    @click="confirmDelete = true"
                >
                    УДАЛИТЬ ВСЕ ДАННЫЕ
                </button>
            </div>
            <div v-else style="display: flex; flex-direction: column; gap: 8px">
                <span style="font-size: 13px; color: var(--mc-danger)"
                    >Все ключи, чаты и настройки будут удалены. Это
                    необратимо.</span
                >
                <div style="display: flex; gap: 8px">
                    <button
                        :style="{
                            padding: '8px 16px',
                            border: '2px solid var(--mc-danger)',
                            background: 'var(--mc-danger)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontFamily: 'var(--mc-mono)',
                            fontWeight: '700',
                        }"
                        @click="deleteAllData"
                    >
                        ПОДТВЕРДИТЬ
                    </button>
                    <button
                        :style="{
                            padding: '8px 16px',
                            border: '2px solid var(--mc-line)',
                            background: 'transparent',
                            color: 'var(--mc-fg-mute)',
                            cursor: 'pointer',
                            fontSize: '13px',
                        }"
                        @click="confirmDelete = false"
                    >
                        Отмена
                    </button>
                </div>
            </div>
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
