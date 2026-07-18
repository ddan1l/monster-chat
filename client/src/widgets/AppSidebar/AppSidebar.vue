<script setup lang="ts">
import { computed, onMounted } from "vue";

import { useRouter, useRoute } from "vue-router";

import { useWs } from "@shared/transport/useWs";
import AppButtonSmall from "@shared/ui/components/AppButtonSmall.vue";
import AppModal from "@shared/ui/components/AppModal.vue";
import IconArchive from "@shared/ui/icons/IconArchive.vue";
import IconBookmark from "@shared/ui/icons/IconBookmark.vue";
import IconChat from "@shared/ui/icons/IconChat.vue";
import IconSearch from "@shared/ui/icons/IconSearch.vue";
import IconSettings from "@shared/ui/icons/IconSettings.vue";

import UserAvatar from "@entities/user/ui/UserAvatar.vue";
import { useUser } from "@entities/user/useUser";

import SettingsPage from "@pages/SettingsPage.vue";

const router = useRouter();
const route = useRoute();
const { user, load } = useUser();
const { connected } = useWs();
onMounted(load);

const activeIndex = computed(
    () => (route.meta.index as number | undefined) ?? -1
);

const showSettings = computed(() => !!route.query.settings);
const showSearch = computed(() => !!route.query.search);
</script>

<template>
    <nav class="mc-sidebar">
        <div v-if="user" class="mc-sidebar__avatar">
            <UserAvatar :avatar-key="user.avatar" :size="40" />
            <span v-if="connected" class="mc-sidebar__status" />
        </div>

        <AppButtonSmall
            :size="48"
            title="Чаты"
            :active="activeIndex === 0 && !showSettings && !showSearch"
            @click="router.push({ name: 'inbox' })"
        >
            <IconChat />
        </AppButtonSmall>

        <AppButtonSmall
            :size="48"
            title="Поиск"
            :active="showSearch"
            @click="router.push({ query: { search: 'true' } })"
        >
            <IconSearch />
        </AppButtonSmall>

        <AppButtonSmall
            :size="48"
            title="Избранное"
            :active="activeIndex === 1"
            disabled
        >
            <IconBookmark />
        </AppButtonSmall>

        <AppButtonSmall
            :size="48"
            title="Архив"
            :active="activeIndex === 2"
            disabled
        >
            <IconArchive />
        </AppButtonSmall>

        <AppButtonSmall
            :size="48"
            title="Настройки"
            :active="showSettings"
            @click="router.push({ query: { settings: 'true' } })"
        >
            <IconSettings class="settings-icon" />
        </AppButtonSmall>
    </nav>

    <AppModal
        title="Поиск"
        :is-visible="showSearch"
        @close="
            router
                .replace({ query: { ...route.query, search: undefined } })
                .catch(() => {})
        "
    />

    <AppModal
        title="Настройки"
        :max-width="640"
        :is-visible="showSettings"
        @close="
            router
                .replace({ query: { ...route.query, settings: undefined } })
                .catch(() => {})
        "
    >
        <SettingsPage />
    </AppModal>
</template>

<style lang="scss" scoped>
$indicator-offset: 4px;

@keyframes indicator-enter {
    from {
        top: 50%;
        bottom: 50%;
        opacity: 0;
    }
    to {
        top: $indicator-offset;
        bottom: $indicator-offset;
        opacity: 1;
    }
}

@keyframes indicator-exit {
    from {
        top: $indicator-offset;
        bottom: $indicator-offset;
        opacity: 1;
    }
    to {
        top: 50%;
        bottom: 50%;
        opacity: 0;
    }
}

.mc-sidebar {
    width: 62px;
    border-right: 1px solid var(--mc-line);
    background-color: var(--mc-bg-rail);
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    padding: 12px 0;
    gap: 2px;

    @media (max-width: bp.$mobile) {
        width: 100%;
        flex-direction: row;
        justify-content: center;
        height: 62px;
        border-right: none;
        border-top: 1px solid var(--mc-line);
    }

    &__avatar {
        position: relative;
        margin-bottom: 12px;
        @media (max-width: bp.$mobile) {
            display: none;
        }
    }

    &__status {
        position: absolute;
        right: -2px;
        bottom: -2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--mc-online);
        box-shadow:
            0 0 0 2px var(--mc-bg-rail),
            0 0 6px var(--mc-online-shadow);
    }

    .mc-btn-sm {
        position: relative;

        svg {
            width: 26px;
            height: 26px;
            color: var(--mc-fg-mute);

            &.settings-icon {
                width: 22px;
                height: 22px;
            }
        }

        &_active {
            svg {
                color: var(--mc-acid);
            }
            @media (max-width: bp.$mobile) {
                background-color: var(--mc-bg-sel);
            }
        }

        &::before {
            content: "";
            position: absolute;
            left: -1px;
            width: 2px;
            top: 50%;
            bottom: 50%;
            background: var(--mc-acid);
            box-shadow: 0 0 6px var(--mc-acid);
            opacity: 0;
            @media (max-width: bp.$mobile) {
                content: none;
            }
        }

        &_active::before {
            animation: indicator-enter 0.22s ease forwards;
        }
    }
}
</style>
