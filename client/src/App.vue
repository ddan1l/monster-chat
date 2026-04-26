<script setup lang="ts">
import type { ClientMessage, ServerMessage } from "shared";
import { ref } from "vue";

const roomId = ref("");
const connected = ref(false);

let ws: WebSocket | null = null;

function connect() {
    ws = new WebSocket("ws://localhost:3000");

    ws.onopen = () => {
        connected.value = true;
        const msg: ClientMessage = { type: "join", roomId: roomId.value };
        ws!.send(JSON.stringify(msg));
    };

    ws.onmessage = (event) => {
        const data: ServerMessage = JSON.parse(event.data);
        console.log("received:", data);
    };

    ws.onclose = () => {
        connected.value = false;
    };
}
</script>

<template>
    <div>
        <h1>Monster Chat</h1>
        <div v-if="!connected">
            <input v-model="roomId" placeholder="Room ID" />
            <button @click="connect">Join</button>
        </div>
        <div v-else>
            <p>Connected to room: {{ roomId }}</p>
        </div>
    </div>
</template>
