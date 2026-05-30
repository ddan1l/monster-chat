<script setup lang="ts">
import type { PeerInfo } from "shared";
import { computed } from "vue";
import { formatLastSeen } from "../../composables/chat/useLastSeen";

const props = defineProps<{
    peer: PeerInfo;
    isOnline: boolean;
    lastSeen: number | null;
    verified: boolean;
    keyChanged: boolean;
}>();

const statusText = computed(() => {
    if (props.isOnline) return "онлайн";
    if (props.lastSeen) return formatLastSeen(props.lastSeen);
    return "офлайн";
});

const emit = defineEmits<{
    openPanel: [];
}>();
</script>

<template>
    <div>
        <!-- Header row -->
        <div
            style="
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            "
        >
            <span style="font-size: 32px">{{ peer.avatar }}</span>
            <div style="flex: 1">
                <strong>{{ peer.name }}</strong>
                <div
                    style="
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        font-size: 12px;
                        color: #888;
                    "
                >
                    <span
                        :style="{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: isOnline ? '#22c55e' : '#d1d5db',
                        }"
                    />
                    {{ statusText }}
                </div>
            </div>

            <!-- Shield button -->
            <button
                :title="
                    verified
                        ? 'Verified — нажмите чтобы посмотреть Safety Numbers'
                        : 'Верифицировать'
                "
                style="
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                "
                @click="emit('openPanel')"
            >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    :stroke="verified ? '#22c55e' : '#555'"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline v-if="verified" points="9 12 11 14 15 10" />
                </svg>
            </button>
        </div>

        <!-- Key rotation warning -->
        <div
            v-if="keyChanged"
            style="
                background: #2d1a00;
                border: 1px solid #92400e;
                border-radius: 8px;
                padding: 10px 14px;
                margin-bottom: 10px;
                font-size: 13px;
                color: #fbbf24;
                display: flex;
                align-items: center;
                gap: 10px;
            "
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fbbf24"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="flex-shrink: 0"
            >
                <path
                    d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
                Ключи собеседника изменились. Сравните Safety Numbers голосом
                или лично и нажмите
                <button
                    style="
                        background: none;
                        border: none;
                        color: #fbbf24;
                        text-decoration: underline;
                        cursor: pointer;
                        padding: 0;
                        font-size: 13px;
                    "
                    @click="emit('openPanel')"
                >
                    Верифицировать</button
                >.
            </span>
        </div>
    </div>
</template>
