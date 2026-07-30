<script setup lang="ts">
import AppButton from "@shared/ui/components/AppButton.vue";

defineProps<{
    verified: boolean | null;
    safetyNumber: string | null;
    peerName: string;
}>();

const emit = defineEmits<{
    markVerified: [];
    removeVerification: [];
}>();
</script>

<template>
    <div class="mc-safety">
        <p class="mc-safety__hint">
            Сверьте эти числа с <strong>{{ peerName }}</strong> — по звонку или
            при встрече. Если они одинаковые у вас обоих, значит вы общаетесь
            напрямую с <strong>{{ peerName }}</strong
            >, а не с посредником, и переписку не прочитать по пути между вами.
        </p>

        <div v-if="safetyNumber" class="mc-safety__grid">
            <span
                v-for="(group, i) in safetyNumber.split(' ')"
                :key="i"
                class="mc-safety__group"
            >
                {{ group }}
            </span>
        </div>
        <div v-else class="mc-safety__pending">Вычисляется…</div>

        <div class="mc-safety__actions">
            <AppButton
                v-if="!verified"
                variant="primary"
                @click="emit('markVerified')"
            >
                Верифицировать
            </AppButton>
            <AppButton
                v-else
                variant="danger"
                @click="emit('removeVerification')"
            >
                Снять верификацию
            </AppButton>
        </div>
    </div>
</template>

<style scoped lang="scss">
.mc-safety {
    display: flex;
    flex-direction: column;
    gap: 20px;

    &__hint {
        margin: 0;
        letter-spacing: 0.01em;
        font-family: var(--mc-mono);
        line-height: 160%;
        strong {
            text-decoration: underline;
            text-underline-offset: 5px;
            text-decoration-color: var(--mc-acid);
        }
    }

    &__grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        padding: 12px;
        font-family: var(--mc-mono);
        font-size: 15px;
        background: var(--mc-bg-rail);
        color: var(--mc-fg);
        border: 1px solid var(--mc-line);
    }

    &__group {
        text-align: center;
    }

    &__pending {
        color: var(--mc-fg-dim);
        font-style: italic;
    }

    &__actions {
        margin-top: 8px;
    }
}
</style>
