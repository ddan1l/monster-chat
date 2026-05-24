<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { PeerInfo } from "shared";
import { useSafetyNumbers } from "../../composables/crypto/useSafetyNumbers";

const props = defineProps<{ peer: PeerInfo; isOnline: boolean; chatId: string }>();

const showPanel = ref(false);
const { safetyNumber, verified, load, markVerified, removeVerification } =
    useSafetyNumbers(props.chatId);

onMounted(() => load(props.peer));
</script>

<template>
    <div>
        <!-- Header row -->
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px">
            <span style="font-size: 32px">{{ peer.avatar }}</span>
            <div style="flex: 1">
                <strong>{{ peer.name }}</strong>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #888">
                    <span :style="{
                        display: 'inline-block', width: '8px', height: '8px',
                        borderRadius: '50%', background: isOnline ? '#22c55e' : '#d1d5db',
                    }" />
                    {{ isOnline ? "онлайн" : "офлайн" }}
                </div>
            </div>

            <!-- Shield button -->
            <button
                :title="verified ? 'Verified — click to see Safety Numbers' : 'Verify Safety Numbers'"
                style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center"
                @click="showPanel = !showPanel"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    :stroke="verified ? '#22c55e' : '#555'"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline v-if="verified" points="9 12 11 14 15 10" />
                </svg>
            </button>
        </div>

        <!-- Safety Numbers panel -->
        <div v-if="showPanel" style="
            border: 1px solid #333;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            font-size: 13px;
        ">
            <div style="display: flex; align-items: center; gap: 8px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    :stroke="verified ? '#22c55e' : '#888'"
                    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline v-if="verified" points="9 12 11 14 15 10" />
                </svg>
                <strong>{{ verified ? "Verified" : "Safety Numbers" }}</strong>
            </div>

            <p style="color: #888; margin: 0">
                Compare these numbers with <strong>{{ peer.name }}</strong> via a voice call or in person.
                If they match — there is no man-in-the-middle.
            </p>

            <!-- Safety number display -->
            <div v-if="safetyNumber" style="
                font-family: monospace;
                font-size: 15px;
                letter-spacing: 0.05em;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 6px;
                background: #1a1a1a;
                border-radius: 8px;
                padding: 12px;
            ">
                <span v-for="(group, i) in safetyNumber.split(' ')" :key="i"
                    style="text-align: center; color: #e5e7eb">
                    {{ group }}
                </span>
            </div>
            <div v-else style="color: #555; font-style: italic">Computing…</div>

            <div style="display: flex; gap: 8px">
                <button v-if="!verified" @click="markVerified">
                    Mark as verified
                </button>
                <button v-else
                    style="background: none; border: 1px solid #555; color: #888; cursor: pointer"
                    @click="removeVerification">
                    Remove verification
                </button>
                <button
                    style="background: none; border: none; color: #888; cursor: pointer"
                    @click="showPanel = false">
                    Close
                </button>
            </div>
        </div>
    </div>
</template>
