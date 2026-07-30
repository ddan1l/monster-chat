import { computed, type Ref } from "vue";

export interface PasswordChecks {
    length: boolean;
    upper: boolean;
    lower: boolean;
    special: boolean;
    digit: boolean;
}

// Оценка силы пароля по единой политике (переиспользуется на setup и backup).
export function usePasswordStrength(password: Ref<string>) {
    const checks = computed<PasswordChecks>(() => ({
        length: password.value.length >= 8,
        upper: /[A-Z]/.test(password.value),
        lower: /[a-z]/.test(password.value),
        special: /[^A-Za-z0-9]/.test(password.value),
        digit: /[0-9]/.test(password.value),
    }));

    const score = computed(
        () => Object.values(checks.value).filter(Boolean).length
    );

    const strengthLabel = computed(() => {
        const s = score.value;
        if (s <= 1) {
            return { text: "Very weak", color: "#ef4444" };
        }
        if (s === 2) {
            return { text: "Weak", color: "#f97316" };
        }
        if (s === 3) {
            return { text: "Fair", color: "#f59e0b" };
        }
        if (s === 4) {
            return { text: "Strong", color: "#84cc16" };
        }
        return { text: "Very strong", color: "#22c55e" };
    });

    // Обязательны 4 проверки (длина + верхний + нижний + спецсимвол); цифра —
    // опциональна, добавляет силу.
    const valid = computed(() => {
        const { length, upper, lower, special } = checks.value;
        return length && upper && lower && special;
    });

    return { checks, score, strengthLabel, valid };
}
