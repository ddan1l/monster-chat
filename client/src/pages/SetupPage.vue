<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@features/auth/useAuth";
import { useUser } from "@entities/user/useUser";
import UserAvatar from "@entities/user/ui/UserAvatar.vue";

const AVATARS = Object.keys(
    import.meta.glob("/src/shared/ui/icons/avatars/*.svg")
).sort();

const router = useRouter();
const { registerPrf, registerPassword, addPasswordFallback } = useAuth();
const { init: initUser } = useUser();

const step = ref<"identity" | "auth" | "password-backup">("identity");

const name = ref("");
const avatar = ref(AVATARS[0]);

const prfLoading = ref(false);
const prfError = ref<string | null>(null);

// password-only registration
const password = ref("");
const passwordConfirm = ref("");
const passwordLoading = ref(false);
const passwordError = ref<string | null>(null);
const showPassword = ref(false);
const showPasswordConfirm = ref(false);

// password-backup after PRF
const backupPassword = ref("");
const backupPasswordConfirm = ref("");
const backupLoading = ref(false);
const backupError = ref<string | null>(null);
const showBackupPassword = ref(false);
const showBackupPasswordConfirm = ref(false);

const passwordChecks = computed(() => ({
    length: password.value.length >= 8,
    upper: /[A-Z]/.test(password.value),
    lower: /[a-z]/.test(password.value),
    special: /[^A-Za-z0-9]/.test(password.value),
    digit: /[0-9]/.test(password.value),
}));

const passwordScore = computed(
    () => Object.values(passwordChecks.value).filter(Boolean).length
);

const passwordStrengthLabel = computed(() => {
    const s = passwordScore.value;
    if (s <= 1) return { text: "Very weak", color: "#ef4444" };
    if (s === 2) return { text: "Weak", color: "#f97316" };
    if (s === 3) return { text: "Fair", color: "#f59e0b" };
    if (s === 4) return { text: "Strong", color: "#84cc16" };
    return { text: "Very strong", color: "#22c55e" };
});

// Require all 4 mandatory checks (length + upper + lower + special)
const passwordValid = computed(() => {
    const { length, upper, lower, special } = passwordChecks.value;
    return length && upper && lower && special;
});

const backupChecks = computed(() => ({
    length: backupPassword.value.length >= 8,
    upper: /[A-Z]/.test(backupPassword.value),
    lower: /[a-z]/.test(backupPassword.value),
    special: /[^A-Za-z0-9]/.test(backupPassword.value),
    digit: /[0-9]/.test(backupPassword.value),
}));

const backupScore = computed(
    () => Object.values(backupChecks.value).filter(Boolean).length
);

const backupStrengthLabel = computed(() => {
    const s = backupScore.value;
    if (s <= 1) return { text: "Very weak", color: "#ef4444" };
    if (s === 2) return { text: "Weak", color: "#f97316" };
    if (s === 3) return { text: "Fair", color: "#f59e0b" };
    if (s === 4) return { text: "Strong", color: "#84cc16" };
    return { text: "Very strong", color: "#22c55e" };
});

const backupValid = computed(() => {
    const { length, upper, lower, special } = backupChecks.value;
    return length && upper && lower && special;
});

function goToAuth() {
    if (!name.value.trim()) return;
    step.value = "auth";
}

async function setupWithPrf() {
    prfLoading.value = true;
    prfError.value = null;
    try {
        await registerPrf(name.value.trim());
        await initUser(name.value.trim(), avatar.value);
        step.value = "password-backup";
    } catch (e) {
        console.error("[PRF] registerPrf failed:", e);
        prfError.value = e instanceof Error ? e.message : String(e);
    } finally {
        prfLoading.value = false;
    }
}

async function saveBackup() {
    backupError.value = null;
    if (!backupValid.value) {
        backupError.value = "Password doesn't meet the requirements";
        return;
    }
    if (backupPassword.value !== backupPasswordConfirm.value) {
        backupError.value = "Passwords don't match";
        return;
    }
    backupLoading.value = true;
    try {
        await addPasswordFallback(backupPassword.value);
        router.replace("/");
    } catch {
        backupError.value = "Failed. Please try again.";
    } finally {
        backupLoading.value = false;
    }
}

async function setupWithPassword() {
    passwordError.value = null;
    if (!passwordValid.value) {
        passwordError.value = "Password doesn't meet the requirements";
        return;
    }
    if (password.value !== passwordConfirm.value) {
        passwordError.value = "Passwords don't match";
        return;
    }
    passwordLoading.value = true;
    try {
        await registerPassword(password.value);
        await initUser(name.value.trim(), avatar.value);
        router.replace("/");
    } catch {
        passwordError.value = "Failed. Please try again.";
    } finally {
        passwordLoading.value = false;
    }
}
</script>

<template>
    <div style="overflow: auto; padding: 20px">
        <template v-if="step === 'identity'">
            <h1 style="margin-bottom: 20px">Welcome to Monster Chat</h1>

            <input
                v-model="name"
                style="margin-bottom: 20px"
                placeholder="Your name"
            />
            <h2>Your avatar</h2>
            <div
                style="display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0"
            >
                <UserAvatar
                    v-for="key in AVATARS"
                    :key="key"
                    :avatar-key="key"
                    selectable
                    :selected="avatar === key"
                    @select="avatar = $event"
                />
            </div>
            <button :disabled="!name.trim()" @click="goToAuth">
                Get started
            </button>
        </template>

        <template v-else-if="step === 'password-backup'">
            <h1>Add a backup password</h1>
            <p style="color: #888; margin-bottom: 8px">
                If your biometrics become unavailable, you'll be able to unlock
                with this password instead.
            </p>
            <p style="font-size: 12px; color: #f59e0b; margin-bottom: 24px">
                Do not save this password in a cloud password manager (Google,
                iCloud). Treat it like a master key.
            </p>

            <div
                style="
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    max-width: 320px;
                "
            >
                <div style="position: relative">
                    <input
                        v-model="backupPassword"
                        :type="showBackupPassword ? 'text' : 'password'"
                        autocomplete="off"
                        placeholder="Backup password"
                        style="
                            width: 100%;
                            box-sizing: border-box;
                            padding-right: 36px;
                        "
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
                        @click="showBackupPassword = !showBackupPassword"
                    >
                        <svg
                            v-if="showBackupPassword"
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

                <template v-if="backupPassword">
                    <div
                        style="display: flex; flex-direction: column; gap: 4px"
                    >
                        <div style="display: flex; gap: 3px">
                            <div
                                v-for="i in 5"
                                :key="i"
                                style="
                                    height: 4px;
                                    flex: 1;
                                    border-radius: 2px;
                                    transition: background 0.2s;
                                "
                                :style="{
                                    background:
                                        i <= backupScore
                                            ? backupStrengthLabel.color
                                            : '#333',
                                }"
                            />
                        </div>
                        <span
                            style="font-size: 11px"
                            :style="{ color: backupStrengthLabel.color }"
                            >{{ backupStrengthLabel.text }}</span
                        >
                    </div>
                    <div
                        style="display: flex; flex-direction: column; gap: 3px"
                    >
                        <div
                            v-for="[key, label] in [
                                ['length', 'At least 8 characters'],
                                ['upper', 'Uppercase letter (A–Z)'],
                                ['lower', 'Lowercase letter (a–z)'],
                                ['special', 'Special character (!@#…)'],
                                ['digit', 'Number (optional)'],
                            ] as [keyof typeof backupChecks, string][]"
                            :key="key"
                            style="
                                display: flex;
                                align-items: center;
                                gap: 6px;
                                font-size: 12px;
                            "
                            :style="{
                                color: backupChecks[key] ? '#22c55e' : '#888',
                            }"
                        >
                            <span>{{ backupChecks[key] ? "✓" : "○" }}</span
                            >{{ label }}
                        </div>
                    </div>
                </template>

                <div style="position: relative">
                    <input
                        v-model="backupPasswordConfirm"
                        :type="showBackupPasswordConfirm ? 'text' : 'password'"
                        autocomplete="off"
                        placeholder="Confirm backup password"
                        style="
                            width: 100%;
                            box-sizing: border-box;
                            padding-right: 36px;
                        "
                        @keydown.enter="saveBackup"
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
                        @click="
                            showBackupPasswordConfirm =
                                !showBackupPasswordConfirm
                        "
                    >
                        <svg
                            v-if="showBackupPasswordConfirm"
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
                    :disabled="
                        backupLoading || !backupValid || !backupPasswordConfirm
                    "
                    @click="saveBackup"
                >
                    {{ backupLoading ? "Saving..." : "Set backup password" }}
                </button>
                <button
                    style="
                        background: none;
                        border: none;
                        color: #888;
                        cursor: pointer;
                        text-decoration: underline;
                        font-size: 13px;
                    "
                    @click="router.replace('/')"
                >
                    Skip — I understand I may lose access if biometrics fail
                </button>
                <p
                    v-if="backupError"
                    style="font-size: 13px; color: #f87171; margin: 0"
                >
                    {{ backupError }}
                </p>
            </div>
        </template>

        <template v-else>
            <h1>Protect your keys</h1>
            <p style="color: #888; margin-bottom: 24px">
                Choose how to secure your private keys on this device.
            </p>

            <div style="display: flex; gap: 16px; align-items: flex-start">
                <!-- Hardware auth -->
                <div
                    style="
                        flex: 1;
                        border: 1px solid #333;
                        border-radius: 12px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
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
                    <p style="font-size: 13px; color: #888; margin: 0">
                        Your private keys never leave the secure chip. Most
                        secure option.
                    </p>
                    <button
                        :disabled="prfLoading"
                        style="margin-top: auto"
                        @click="setupWithPrf"
                    >
                        {{ prfLoading ? "Waiting..." : "Use biometrics" }}
                    </button>
                    <p
                        v-if="prfError"
                        style="font-size: 13px; color: #f87171; margin: 0"
                    >
                        {{ prfError }}
                    </p>
                </div>

                <!-- Password -->
                <div
                    style="
                        flex: 1;
                        border: 1px solid #333;
                        border-radius: 12px;
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
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
                    <p style="font-size: 13px; color: #888; margin: 0">
                        Keys are encrypted with your password.
                    </p>
                    <p style="font-size: 12px; color: #f59e0b; margin: 0">
                        Less secure than biometrics — use a strong, unique
                        password.
                    </p>
                    <p style="font-size: 12px; color: #888; margin: 0">
                        Do not save this password in a cloud password manager
                        (Google, iCloud). It protects your private keys — treat
                        it like a master key.
                    </p>
                    <div style="position: relative">
                        <input
                            v-model="password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="off"
                            placeholder="Password"
                            style="
                                width: 100%;
                                box-sizing: border-box;
                                padding-right: 36px;
                            "
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

                    <!-- Strength bar + checklist -->
                    <template v-if="password">
                        <div
                            style="
                                display: flex;
                                flex-direction: column;
                                gap: 4px;
                            "
                        >
                            <div style="display: flex; gap: 3px">
                                <div
                                    v-for="i in 5"
                                    :key="i"
                                    style="
                                        height: 4px;
                                        flex: 1;
                                        border-radius: 2px;
                                        transition: background 0.2s;
                                    "
                                    :style="{
                                        background:
                                            i <= passwordScore
                                                ? passwordStrengthLabel.color
                                                : '#333',
                                    }"
                                />
                            </div>
                            <span
                                style="font-size: 11px"
                                :style="{ color: passwordStrengthLabel.color }"
                            >
                                {{ passwordStrengthLabel.text }}
                            </span>
                        </div>
                        <div
                            style="
                                display: flex;
                                flex-direction: column;
                                gap: 3px;
                            "
                        >
                            <div
                                v-for="[key, label] in [
                                    ['length', 'At least 8 characters'],
                                    ['upper', 'Uppercase letter (A–Z)'],
                                    ['lower', 'Lowercase letter (a–z)'],
                                    ['special', 'Special character (!@#…)'],
                                    [
                                        'digit',
                                        'Number (optional, adds strength)',
                                    ],
                                ] as [keyof typeof passwordChecks, string][]"
                                :key="key"
                                style="
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                    font-size: 12px;
                                "
                                :style="{
                                    color: passwordChecks[key]
                                        ? '#22c55e'
                                        : '#888',
                                }"
                            >
                                <span>{{
                                    passwordChecks[key] ? "✓" : "○"
                                }}</span>
                                {{ label }}
                            </div>
                        </div>
                    </template>

                    <div style="position: relative">
                        <input
                            v-model="passwordConfirm"
                            :type="showPasswordConfirm ? 'text' : 'password'"
                            autocomplete="off"
                            placeholder="Confirm password"
                            style="
                                width: 100%;
                                box-sizing: border-box;
                                padding-right: 36px;
                            "
                            @keydown.enter="setupWithPassword"
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
                            @click="showPasswordConfirm = !showPasswordConfirm"
                        >
                            <svg
                                v-if="showPasswordConfirm"
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
                        :disabled="
                            passwordLoading ||
                            !passwordValid ||
                            !passwordConfirm
                        "
                        @click="setupWithPassword"
                    >
                        {{ passwordLoading ? "Saving..." : "Use password" }}
                    </button>
                    <p
                        v-if="passwordError"
                        style="font-size: 13px; color: #f87171; margin: 0"
                    >
                        {{ passwordError }}
                    </p>
                </div>
            </div>
        </template>
    </div>
</template>
