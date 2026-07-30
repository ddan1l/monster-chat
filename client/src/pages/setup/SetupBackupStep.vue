<script setup lang="ts">
import { ref } from "vue";

import PasswordInput from "@shared/ui/components/PasswordInput.vue";

import PasswordStrength from "@features/auth/ui/PasswordStrength.vue";
import { useAuth } from "@features/auth/useAuth";
import { usePasswordStrength } from "@features/auth/usePasswordStrength";

const emit = defineEmits<{ done: []; skip: [] }>();

const { addPasswordFallback } = useAuth();

const password = ref("");
const passwordConfirm = ref("");
const loading = ref(false);
const error = ref<string | null>(null);

const { valid } = usePasswordStrength(password);

async function save() {
    error.value = null;
    if (!valid.value) {
        error.value = "Password doesn't meet the requirements";
        return;
    }
    if (password.value !== passwordConfirm.value) {
        error.value = "Passwords don't match";
        return;
    }
    loading.value = true;
    try {
        await addPasswordFallback(password.value);
        emit("done");
    } catch {
        error.value = "Failed. Please try again.";
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div>
        <h1>Add a backup password</h1>
        <p style="color: #888; margin-bottom: 8px">
            If your biometrics become unavailable, you'll be able to unlock with
            this password instead.
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
            <PasswordInput v-model="password" placeholder="Backup password" />

            <PasswordStrength v-if="password" :password="password" />

            <PasswordInput
                v-model="passwordConfirm"
                placeholder="Confirm backup password"
                @submit="save"
            />

            <button
                :disabled="loading || !valid || !passwordConfirm"
                @click="save"
            >
                {{ loading ? "Saving..." : "Set backup password" }}
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
                @click="emit('skip')"
            >
                Skip — I understand I may lose access if biometrics fail
            </button>
            <p v-if="error" style="font-size: 13px; color: #f87171; margin: 0">
                {{ error }}
            </p>
        </div>
    </div>
</template>
