<script setup lang="ts">
import { ref } from "vue";

import { useRouter } from "vue-router";

import QrScanner from "@shared/ui/components/QrScanner.vue";

import { useAuth } from "@features/auth/useAuth";
import { useLinking, type LinkBundle } from "@features/auth/useLinking";

const router = useRouter();
const { importBundle, storeImported } = useLinking();
const { linkWithPassword, linkWithPrf } = useAuth();

const showScanner = ref(false);
// QR несёт только строку переноса; код вводится отдельно.
function onScan(text: string): void {
    transfer.value = text;
    showScanner.value = false;
}

// transfer — зашифрованный блоб с примари, code — одноразовый ключ к нему.
// Метод входа (PIN/биометрия) на этом устройстве — свой; identity общий.
const transfer = ref("");
const code = ref("");
const pin = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

// Общее: расшифровать бандл кодом → записать identity/чаты/peer-инфо в IDB.
async function importAndStore(): Promise<LinkBundle | null> {
    if (!transfer.value.trim() || !code.value.trim()) {
        error.value = "Заполните строку переноса и код.";
        return null;
    }
    // Код нормализуем в верхний регистр — алфавит кода без строчных.
    const bundle = await importBundle(
        transfer.value.trim(),
        code.value.trim().toUpperCase()
    );
    await storeImported(bundle);
    return bundle;
}

function fail(e: unknown): void {
    // Неверный код/битый блоб → AES-GCM бросает на расшифровке.
    console.error("[link] failed:", e);
    error.value = "Не удалось привязать — проверьте код и строку переноса.";
}

async function linkPin(): Promise<void> {
    error.value = null;
    if (pin.value.length < 8) {
        error.value = "PIN — минимум 8 символов.";
        return;
    }
    loading.value = true;
    try {
        const bundle = await importAndStore();
        if (!bundle) {
            return;
        }
        await linkWithPassword(pin.value, bundle.ecdh, bundle.sign);
        router.replace("/app");
    } catch (e) {
        fail(e);
    } finally {
        loading.value = false;
    }
}

async function linkBiometric(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
        const bundle = await importAndStore();
        if (!bundle) {
            return;
        }
        // Регистрируем СВОЙ WebAuthn-credential на этом устройстве.
        await linkWithPrf(
            bundle.user?.name ?? "Monster Chat",
            bundle.ecdh,
            bundle.sign
        );
        router.replace("/app");
    } catch (e) {
        fail(e);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div style="overflow: auto; padding: 20px; max-width: 440px">
        <h1 style="margin-bottom: 8px">Привязать устройство</h1>
        <p style="color: #888; margin-bottom: 20px; font-size: 13px">
            На устройстве с аккаунтом: Настройки → «Привязать устройство».
            Перенесите оттуда строку и код сюда.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px">
            <button
                style="
                    background: none;
                    border: 1px solid #444;
                    border-radius: 8px;
                    color: #ccc;
                    cursor: pointer;
                    font-size: 13px;
                    padding: 8px;
                "
                @click="showScanner = !showScanner"
            >
                {{ showScanner ? "Скрыть камеру" : "📷 Сканировать QR" }}
            </button>
            <QrScanner v-if="showScanner" @decode="onScan" />
            <textarea
                v-model="transfer"
                rows="4"
                placeholder="Строка переноса (или отсканируйте QR)"
                style="
                    width: 100%;
                    box-sizing: border-box;
                    font-family: monospace;
                "
            />
            <input
                v-model="code"
                placeholder="Код"
                autocomplete="off"
                style="text-transform: uppercase"
            />

            <button :disabled="loading" @click="linkBiometric">
                {{ loading ? "Привязка..." : "Привязать по биометрии" }}
            </button>

            <div
                style="
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                    margin: 4px 0;
                "
            >
                или PIN
            </div>
            <input
                v-model="pin"
                type="password"
                autocomplete="off"
                placeholder="PIN для этого устройства (мин. 8)"
                @keydown.enter="linkPin"
            />
            <button :disabled="loading" @click="linkPin">
                Привязать по PIN
            </button>

            <p v-if="error" style="color: #f87171; font-size: 13px; margin: 0">
                {{ error }}
            </p>
            <button
                style="
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    text-decoration: underline;
                    font-size: 13px;
                "
                @click="router.replace('/app/setup')"
            >
                Создать новый аккаунт вместо этого
            </button>
        </div>
    </div>
</template>
