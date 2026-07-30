<script setup lang="ts">
import { toRef } from "vue";

import {
    usePasswordStrength,
    type PasswordChecks,
} from "@features/auth/usePasswordStrength";

const props = defineProps<{ password: string }>();

const { checks, score, strengthLabel } = usePasswordStrength(
    toRef(props, "password")
);

const CHECKLIST: [keyof PasswordChecks, string][] = [
    ["length", "At least 8 characters"],
    ["upper", "Uppercase letter (A–Z)"],
    ["lower", "Lowercase letter (a–z)"],
    ["special", "Special character (!@#…)"],
    ["digit", "Number (optional)"],
];
</script>

<template>
    <div class="mc-strength">
        <div class="mc-strength__meter">
            <div class="mc-strength__bars">
                <div
                    v-for="i in 5"
                    :key="i"
                    class="mc-strength__bar"
                    :style="{
                        background: i <= score ? strengthLabel.color : '#333',
                    }"
                />
            </div>
            <span
                class="mc-strength__label"
                :style="{ color: strengthLabel.color }"
                >{{ strengthLabel.text }}</span
            >
        </div>

        <div class="mc-strength__checks">
            <div
                v-for="[key, label] in CHECKLIST"
                :key="key"
                class="mc-strength__check"
                :style="{ color: checks[key] ? '#22c55e' : '#888' }"
            >
                <span>{{ checks[key] ? "✓" : "○" }}</span
                >{{ label }}
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.mc-strength {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &__meter {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__bars {
        display: flex;
        gap: 3px;
    }

    &__bar {
        height: 4px;
        flex: 1;
        border-radius: 2px;
        transition: background 0.2s;
    }

    &__label {
        font-size: 11px;
    }

    &__checks {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    &__check {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
    }
}
</style>
