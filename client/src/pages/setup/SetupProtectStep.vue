<script setup lang="ts">
import { ref } from "vue";

import PasswordInput from "@shared/ui/components/PasswordInput.vue";

import { useUser } from "@entities/user/useUser";

import PasswordStrength from "@features/auth/ui/PasswordStrength.vue";
import { useAuth } from "@features/auth/useAuth";
import { usePasswordStrength } from "@features/auth/usePasswordStrength";

const props = defineProps<{ name: string; avatar: string }>();

const emit = defineEmits<{ backup: []; done: [] }>();

const { registerPrf, registerPassword } = useAuth();
const { init: initUser } = useUser();

const prfLoading = ref(false);
const prfError = ref<string | null>(null);

const password = ref("");
const passwordConfirm = ref("");
const passwordLoading = ref(false);
const passwordError = ref<string | null>(null);

const { valid } = usePasswordStrength(password);

async function setupWithPrf() {
    prfLoading.value = true;
    prfError.value = null;
    try {
        await registerPrf(props.name.trim());
        await initUser(props.name.trim(), props.avatar);
        emit("backup");
    } catch (e) {
        console.error("[PRF] registerPrf failed:", e);
        prfError.value = e instanceof Error ? e.message : String(e);
    } finally {
        prfLoading.value = false;
    }
}

async function setupWithPassword() {
    passwordError.value = null;
    if (!valid.value) {
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
        await initUser(props.name.trim(), props.avatar);
        emit("done");
    } catch {
        passwordError.value = "Failed. Please try again.";
    } finally {
        passwordLoading.value = false;
    }
}
</script>

<template>
    <div>
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
                    Your private keys never leave the secure chip. Most secure
                    option.
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
                    Less secure than biometrics — use a strong, unique password.
                </p>
                <p style="font-size: 12px; color: #888; margin: 0">
                    Do not save this password in a cloud password manager
                    (Google, iCloud). It protects your private keys — treat it
                    like a master key.
                </p>

                <PasswordInput v-model="password" placeholder="Password" />

                <PasswordStrength v-if="password" :password="password" />

                <PasswordInput
                    v-model="passwordConfirm"
                    placeholder="Confirm password"
                    @submit="setupWithPassword"
                />
                <button
                    :disabled="passwordLoading || !valid || !passwordConfirm"
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
    </div>
</template>
