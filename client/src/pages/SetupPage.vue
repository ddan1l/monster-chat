<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useCrypto } from "../composables/useCrypto";
import { useUser } from "../composables/useUser";

const AVATARS = [
    "🦴",
    "🦷",
    "👂",
    "🫀",
    "🫁",
    "🧠",
    "👁️",
    "👀",
    "👄",
    "👅",
    "🫦",
    "🕳️",
    "🩻",
    "🧬",
    "⚡",
    "🔮",
    "🪄",
    "🗝️",
    "🪬",
    "🧨",
    "🌘",
    "🌑",
    "🌚",
    "🌫️",
    "🌪️",
    "🌊",
    "🌋",
    "🧊",
    "🧟",
    "👹",
    "👺",
    "👻",
    "👾",
    "😈",
    "👿",
    "👽",
    "🤖",
    "🧌",
    "🦇",
    "🐍",
    "🦂",
    "🐉",
    "🐲",
    "🐺",
    "🦖",
    "🦕",
    "🐙",
    "🪼",
    "🕷️",
    "🕸️",
];

const router = useRouter();
const { init: initCrypto } = useCrypto();
const { init: initUser } = useUser();

const name = ref("");
const avatar = ref(AVATARS[0]);
const loading = ref(false);

async function setup() {
    if (!name.value.trim() || !avatar.value) return;
    loading.value = true;
    await Promise.all([
        initCrypto(),
        initUser(name.value.trim(), avatar.value),
    ]);
    router.replace("/");
}
</script>

<template>
    <div>
        <h1>Welcome to Monster Chat</h1>
        <h2>Your name</h2>
        <input v-model="name" placeholder="Your name" :disabled="loading" />
        <h2>Your avatar</h2>
        <div
            style="
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 12px 0;
                max-width: 400px;
            "
        >
            <button
                v-for="emoji in AVATARS"
                :key="emoji"
                :disabled="loading"
                style="
                    font-size: 24px;
                    padding: 4px;
                    cursor: pointer;
                    border-radius: 6px;
                "
                :style="{
                    outline:
                        avatar === emoji ? '2px solid currentColor' : 'none',
                }"
                @click="avatar = emoji"
            >
                {{ emoji }}
            </button>
        </div>
        <button :disabled="loading || !name.trim()" @click="setup">
            {{ loading ? "Setting up..." : "Get started" }}
        </button>
    </div>
</template>
