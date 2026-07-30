<script setup lang="ts">
import { ref } from "vue";

import { useRoute, useRouter } from "vue-router";

import SetupBackupStep from "./setup/SetupBackupStep.vue";
import SetupIdentityStep from "./setup/SetupIdentityStep.vue";
import SetupProtectStep from "./setup/SetupProtectStep.vue";

const AVATARS = Object.keys(
    import.meta.glob("/src/shared/ui/icons/avatars/*.svg")
).sort();

const router = useRouter();
const route = useRoute();

const step = ref<"identity" | "protect" | "backup">("identity");
const name = ref("");
const avatar = ref(AVATARS[0]);

function redirectAfterSetup() {
    const redirect = route.query.redirect;
    router.replace(typeof redirect === "string" ? redirect : "/app");
}
</script>

<template>
    <div style="overflow: auto; padding: 20px">
        <SetupIdentityStep
            v-if="step === 'identity'"
            v-model:name="name"
            v-model:avatar="avatar"
            :avatars="AVATARS"
            @next="step = 'protect'"
            @link="router.push('/app/link')"
        />

        <SetupProtectStep
            v-else-if="step === 'protect'"
            :name="name"
            :avatar="avatar"
            @backup="step = 'backup'"
            @done="redirectAfterSetup"
        />

        <SetupBackupStep
            v-else
            @done="redirectAfterSetup"
            @skip="router.replace('/')"
        />
    </div>
</template>
