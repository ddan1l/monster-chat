<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useCrypto } from "../composables/useCrypto";
import { useUser } from "../composables/useUser";

const router = useRouter();
const { init: initCrypto } = useCrypto();
const { init: initUser } = useUser();

const name = ref("");
const loading = ref(false);

async function setup() {
    if (!name.value.trim()) return;
    loading.value = true;
    await Promise.all([initCrypto(), initUser(name.value.trim())]);
    router.replace("/");
}
</script>

<template>
    <div>
        <h1>Welcome to Monster Chat</h1>
        <input v-model="name" placeholder="Your name" :disabled="loading" />
        <button :disabled="loading || !name.trim()" @click="setup">
            {{ loading ? "Setting up..." : "Get started" }}
        </button>
    </div>
</template>
