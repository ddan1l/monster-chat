<script setup lang="ts">
import { computed, watch, ref, onMounted } from "vue";

import { useRoute, useRouter } from "vue-router";

import { canInstallApp, isTauri } from "@shared/lib/useTauri";

import { useChats } from "@entities/chat/useChats";

const route = useRoute();
const router = useRouter();
const { knockChat, chats } = useChats();

const chatId = route.params.chatId as string;
const hostKey = computed(() => window.location.hash.slice(5));
const appOpened = ref(false);

onMounted(() => {
    if (isTauri || !canInstallApp) return;
    const deepLink = `monsterchat://app/join/${chatId}${window.location.hash}`;
    window.location.href = deepLink;
    setTimeout(() => {
        appOpened.value = false;
    }, 1500);
    appOpened.value = true;
});

const canJoin = computed(() => !!chatId && !!hostKey.value);
const knocked = ref(false);
const error = ref<string | null>(null);

watch(
    () => chats.value.find((c) => c.id === chatId)?.isActive,
    (isActive) => {
        if (isActive) router.push(`/app/chat/${chatId}`);
    }
);

async function join() {
    try {
        await knockChat(chatId, hostKey.value);
        knocked.value = true;
    } catch {
        error.value = "Не удалось отправить запрос";
    }
}
</script>

<template>
    <div>
        <p v-if="error">{{ error }}</p>
        <template v-else-if="knocked">
            <p>Запрос отправлен. Ожидание подтверждения...</p>
        </template>
        <template v-else-if="appOpened">
            <p>Открываем приложение...</p>
        </template>
        <template v-else-if="canInstallApp && !isTauri">
            <p v-if="!canJoin">Неверная ссылка</p>
            <a v-else :href="`monsterchat://app/join/${chatId}${$route.hash}`">
                Открыть в приложении
            </a>
        </template>
        <template v-else>
            <p v-if="!canJoin">Неверная ссылка</p>
            <button v-else @click="join">Присоединиться</button>
        </template>
    </div>
</template>
