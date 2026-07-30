<script setup lang="ts">
import UserAvatar from "@entities/user/ui/UserAvatar.vue";

const name = defineModel<string>("name", { required: true });
const avatar = defineModel<string>("avatar", { required: true });

defineProps<{ avatars: string[] }>();

const emit = defineEmits<{ next: []; link: [] }>();
</script>

<template>
    <div>
        <h1 style="margin-bottom: 20px">Welcome to Monster Chat</h1>

        <input
            v-model="name"
            style="margin-bottom: 20px"
            placeholder="Your name"
        />
        <h2>Your avatar</h2>
        <div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0">
            <UserAvatar
                v-for="key in avatars"
                :key="key"
                :avatar-key="key"
                selectable
                :selected="avatar === key"
                @select="avatar = $event"
            />
        </div>
        <button :disabled="!name.trim()" @click="emit('next')">
            Get started
        </button>
        <!-- Второй сценарий: не создавать аккаунт, а привязать это устройство к
             уже существующему (модель A). -->
        <button
            style="
                display: block;
                margin-top: 16px;
                background: none;
                border: none;
                color: #888;
                cursor: pointer;
                text-decoration: underline;
                font-size: 13px;
            "
            @click="emit('link')"
        >
            Уже есть аккаунт? Привязать это устройство
        </button>
    </div>
</template>
