<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

import { useRouter } from "vue-router";

import { useAuth, type AuthMethod } from "@features/auth/useAuth";

const router = useRouter();
const {
    getAuthMethods,
    authenticate,
    authenticateWithPassword,
    failCount,
    lockoutUntil,
    maxAttempts,
} = useAuth();

const authMethods = ref<AuthMethod[]>([]);
const password = ref("");
const showPassword = ref(false);
const prfLoading = ref(false);
const passwordLoading = ref(false);
const prfError = ref<string | null>(null);
const passwordError = ref<string | null>(null);

// Countdown timer
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

const lockedSecsRemaining = computed(() => {
    const diff = lockoutUntil.value - now.value;
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
});

const isLocked = computed(() => lockedSecsRemaining.value > 0);
const attemptsLeft = computed(() => Math.max(0, maxAttempts - failCount.value));

onMounted(async () => {
    authMethods.value = await getAuthMethods();
    if (authMethods.value.length === 0) {
        router.replace("/setup");
        return;
    }
    timer = setInterval(() => {
        now.value = Date.now();
    }, 500);
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});

async function unlockWithPrf() {
    prfLoading.value = true;
    prfError.value = null;
    try {
        await authenticate();
        router.replace("/");
    } catch (e) {
        console.error("[unlock:prf]", e);
        prfError.value = "Authentication failed. Try again.";
    } finally {
        prfLoading.value = false;
    }
}

async function unlockWithPassword() {
    if (isLocked.value) return;
    passwordLoading.value = true;
    passwordError.value = null;
    try {
        await authenticateWithPassword(password.value);
        router.replace("/");
    } catch (e) {
        console.error("[unlock:password]", e);
        const msg = e instanceof Error ? e.message : "";
        if (msg.startsWith("LOCKED:")) {
            // lockoutUntil ref is already updated inside useAuth
        } else if (isLocked.value) {
            passwordError.value = `Too many attempts. Try again in ${lockedSecsRemaining.value}s.`;
        } else if (attemptsLeft.value > 0) {
            passwordError.value = `Wrong password. ${attemptsLeft.value} attempt${attemptsLeft.value === 1 ? "" : "s"} left.`;
        } else {
            passwordError.value = "Wrong password.";
        }
    } finally {
        passwordLoading.value = false;
    }
}
</script>

<template>
    <div
        style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            gap: 24px;
        "
    >
        <h1>Unlock Monster Chat</h1>

        <div style="display: flex; gap: 16px; align-items: flex-start">
            <template v-if="authMethods.includes('prf')">
                <div
                    style="
                        border: 1px solid #333;
                        border-radius: 12px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        min-width: 200px;
                    "
                >
                    <div style="display: flex; align-items: center; gap: 8px">
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M12 1a7 7 0 0 1 7 7" />
                            <path d="M5 8a7 7 0 0 1 7-7" />
                            <path d="M12 3a5 5 0 0 1 5 5v1" />
                            <path d="M7 8a5 5 0 0 1 5-5" />
                            <path d="M12 5a3 3 0 0 1 3 3v5" />
                            <path d="M9 8a3 3 0 0 1 3-3" />
                            <path
                                d="M12 7a1 1 0 0 1 1 1v8a5 5 0 0 1-5-5V8a4 4 0 0 1 4-4"
                            />
                            <path d="M5 12v2a7 7 0 0 0 11.9 5" />
                        </svg>
                        <strong>Windows Hello / Touch ID</strong>
                    </div>
                    <button :disabled="prfLoading" @click="unlockWithPrf">
                        {{
                            prfLoading
                                ? "Authenticating..."
                                : "Unlock with biometrics"
                        }}
                    </button>
                    <p
                        v-if="prfError"
                        style="font-size: 13px; color: #f87171; margin: 0"
                    >
                        {{ prfError }}
                    </p>
                </div>
            </template>

            <template v-if="authMethods.includes('pin')">
                <div
                    style="
                        border: 1px solid #333;
                        border-radius: 12px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        min-width: 200px;
                    "
                >
                    <div style="display: flex; align-items: center; gap: 8px">
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.6"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <strong>Password</strong>
                    </div>

                    <p
                        v-if="isLocked"
                        style="font-size: 13px; color: #f87171; margin: 0"
                    >
                        Too many attempts. Try again in
                        {{ lockedSecsRemaining }}s.
                    </p>
                    <p
                        v-else-if="failCount > 0 && attemptsLeft <= 2"
                        style="font-size: 13px; color: #f59e0b; margin: 0"
                    >
                        {{ attemptsLeft }} attempt{{
                            attemptsLeft === 1 ? "" : "s"
                        }}
                        left before lockout.
                    </p>

                    <div style="position: relative">
                        <input
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="off"
                            placeholder="Password"
                            :disabled="passwordLoading || isLocked"
                            style="
                                width: 100%;
                                box-sizing: border-box;
                                padding-right: 36px;
                            "
                            @keydown.enter="unlockWithPassword"
                        />
                        <button
                            type="button"
                            tabindex="-1"
                            style="
                                position: absolute;
                                right: 8px;
                                top: 50%;
                                transform: translateY(-50%);
                                background: none;
                                border: none;
                                cursor: pointer;
                                padding: 0;
                                color: #888;
                                display: flex;
                            "
                            @click="showPassword = !showPassword"
                        >
                            <svg
                                v-if="showPassword"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                                />
                                <path
                                    d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                                />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                            <svg
                                v-else
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="1.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </button>
                    </div>
                    <button
                        :disabled="passwordLoading || !password || isLocked"
                        @click="unlockWithPassword"
                    >
                        {{
                            passwordLoading
                                ? "Unlocking..."
                                : "Unlock with password"
                        }}
                    </button>
                    <p
                        v-if="passwordError && !isLocked"
                        style="font-size: 13px; color: #f87171; margin: 0"
                    >
                        {{ passwordError }}
                    </p>
                </div>
            </template>
        </div>
    </div>
</template>
