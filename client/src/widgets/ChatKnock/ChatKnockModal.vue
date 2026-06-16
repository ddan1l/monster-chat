<script setup lang="ts">
import AppModal from "@shared/ui/components/AppModal.vue";
import UserCard from "@entities/user/ui/UserCard.vue";
import AppAlert from "@shared/ui/components/AppAlert.vue";
import IconAlert from "@shared/ui/icons/IconAlert.vue";
import { ref, computed, onMounted } from "vue";

import { useChats, chats } from "@entities/chat/useChats";
import { pendingKnocks } from "@entities/chat/usePendingKnocks";
import ChatInviteLink from "@widgets/ChatView/ChatInviteLink.vue";
import AppButton from "@shared/ui/components/AppButton.vue";

const { createChat, approveChat, cancelPendingChat } = useChats();

const newChatId = ref("");
const newChatLink = ref("");
const isModalVisible = ref(true);

const newChatKnock = computed(() =>
    pendingKnocks.value.find((k) => k.chatId === newChatId.value)
);

const emit = defineEmits<{ close: [] }>();

async function handleCreateNewChat() {
    const chat = await createChat();
    newChatId.value = chat.id;
    newChatLink.value = chat.joinLink ?? "";
}

async function cancelChat() {
    const chat = chats.value.find((c) => c.id === newChatId.value);

    if (chat && !chat.isActive) {
        await cancelPendingChat(newChatId.value);
    }
}

const handleCancelChat = async (closeModal?: () => void) => {
    await cancelChat();

    if (closeModal) {
        closeModal();
    }

    emit("close");
};

const handleApproveChat = async (closeModal?: () => void) => {
    await approveChat(newChatId.value);

    if (closeModal) {
        closeModal();
    }

    emit("close");
};

onMounted(() => {
    handleCreateNewChat();
});
</script>

<template>
    <AppModal
        :title="newChatKnock ? 'Входящий запрос' : 'Новый чат'"
        :is-visible="isModalVisible"
        @close="handleCancelChat"
    >
        <template #default="{ closeModal }">
            <div class="mc-new-chat">
                <template v-if="newChatKnock">
                    <h1>НОВЫЙ ЧАТ С</h1>

                    <UserCard
                        variant="large"
                        online
                        :peer="newChatKnock.peerInfo"
                    >
                        {{ newChatKnock.peerInfo.ecdhPubKey }}
                    </UserCard>

                    <div class="mc-new-chat-table">
                        <div class="mc-new-chat-row">
                            <span>IP-адрес</span>
                            <span>
                                {{ newChatKnock.ip }}
                            </span>
                        </div>

                        <div class="mc-new-chat-row">
                            <span>Timezone</span>
                            <span>
                                {{ newChatKnock.timezone }}
                            </span>
                        </div>

                        <div class="mc-new-chat-row">
                            <span>Транспорт</span>
                            <span class="color-accent"> WSS / TLS 1.3 </span>
                        </div>
                    </div>

                    <AppAlert display="flex">
                        <IconAlert />
                        Сверьте отпечаток при первом сообщении - личность ещё не
                        подтверждена.
                    </AppAlert>

                    <div class="mc-actions">
                        <AppButton
                            variant="danger"
                            @click="() => handleCancelChat(closeModal)"
                        >
                            Отменить
                        </AppButton>

                        <AppButton
                            variant="primary"
                            @click="() => handleApproveChat(closeModal)"
                        >
                            Принять
                        </AppButton>
                    </div>
                </template>

                <template v-else>
                    <h1>
                        ПРИГЛАСИТЬ <br />
                        В ЧАТ
                    </h1>

                    <div>
                        <p class="label">Одноразовая ссылка-приглашение.</p>
                        <ChatInviteLink
                            v-if="newChatLink"
                            :link="newChatLink"
                        />
                    </div>

                    <AppAlert display="flex">
                        <IconAlert />
                        Отправьте ссылку собеседнику через удобный для вас канал
                        связи. Оставьте это окно открытым, пока он не
                        присоединится к беседе.
                    </AppAlert>

                    <AppButton
                        variant="danger"
                        @click="() => handleCancelChat(closeModal)"
                    >
                        Отменить
                    </AppButton>
                </template>
            </div>
        </template>
    </AppModal>
</template>

<style lang="scss" scoped>
.mc-new-chat {
    display: flex;
    flex-direction: column;
    gap: 24px;
}
.mc-new-chat-row {
    padding: 0 6px;
}
.mc-new-chat-table {
    border-top: 1px solid var(--mc-line);
    border-bottom: 1px solid var(--mc-line);
    padding: 12px var(--mc-modal-padding);
    margin: 0 calc(0px - var(--mc-modal-padding));
}
.mc-actions {
    display: flex;
    grid-gap: 10px;
}
.mc-new-chat-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    font-family: var(--mc-mono);
    font-size: 0.8em;
    font-weight: 600;
    span:first-child {
        text-transform: uppercase;
        font-weight: 600;
        font-size: 0.78em;
        color: var(--mc-fg-dim);
    }
}
</style>
