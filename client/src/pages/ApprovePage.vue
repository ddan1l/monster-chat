<script setup lang="ts">
import { computed, watch, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChats } from "../composables/useChats";

const route = useRoute();
const router = useRouter();
const { knockChat, chats } = useChats();

const chatId = route.params.chatId as string;
const hostKey = computed(() => window.location.hash.slice(5));

const canJoin = computed(() => !!chatId && !!hostKey.value);
const knocked = ref(false);
const error = ref<string | null>(null);

watch(
    () => chats.value.find((c) => c.id === chatId)?.isActive,
    (isActive) => {
        if (isActive) router.push(`/chat/${chatId}`);
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
        <template v-else>
            <p v-if="!canJoin">Неверная ссылка</p>
            <button v-else @click="join">Присоединиться</button>
        </template>
    </div>
</template>
