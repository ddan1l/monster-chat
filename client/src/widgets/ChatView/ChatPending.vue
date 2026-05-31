<script setup lang="ts">
import type { Chat } from "shared";

defineProps<{ chat: Chat }>();
</script>

<template>
    <div>
        <p>Ожидание участника, вот ссылочка:</p>
        <a v-if="chat.joinLink" :href="chat.joinLink">{{ chat.joinLink }}</a>
    </div>
</template>
