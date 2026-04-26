import { ref, onUnmounted } from "vue";
import { nanoid } from "nanoid";
import type { Chat, Message, ServerMessage } from "shared";
import { useIndexedDb, STORES } from "./useIndexedDb";
import { useMessages } from "./useMessages";
import { useUser } from "./useUser";

const chats = ref<Chat[]>([]);

export function useChat(chatId?: string) {
    const { readAll, write, read } = useIndexedDb(STORES.CHATS);

    async function loadChats(): Promise<void> {
        chats.value = await readAll<Chat>();
    }

    async function createChat(): Promise<Chat> {
        const id = nanoid(8);
        const chat: Chat = {
            id,
            link: `${window.location.origin}/chat/${id}`,
            createdAt: Date.now(),
        };
        await write(chat);
        chats.value.push(chat);
        return chat;
    }

    const ws = ref<WebSocket | null>(null);
    const connected = ref(false);
    const error = ref<string | null>(null);
    const messages = ref<Message[]>([]);
    const { saveMessage, getByChat } = useMessages();
    const { user, load: loadUser } = useUser();

    async function connect() {
        if (!chatId) return;

        if (!user.value) await loadUser();
        messages.value = await getByChat(chatId);

        ws.value = new WebSocket("ws://localhost:3000");

        ws.value.onopen = () => {
            ws.value!.send(JSON.stringify({ type: "join", chatId, userId: user.value!.id }));
        };

        ws.value.onmessage = async ({ data }) => {
            const msg: ServerMessage = JSON.parse(data);

            if (msg.type === "joined") {
                const existing = await read<Chat>(chatId);
                if (!existing) {
                    const newChat: Chat = {
                        id: chatId,
                        link: `${window.location.origin}/chat/${chatId}`,
                        createdAt: Date.now(),
                    };
                    await write(newChat);
                    chats.value.push(newChat);
                }
                connected.value = true;
                return;
            }

            if (msg.type === "error") {
                error.value = msg.message;
                ws.value?.close();
                return;
            }

            if (msg.type !== "message") return;
            await saveMessage(msg.payload);
            messages.value.push(msg.payload);
        };

        ws.value.onclose = () => {
            connected.value = false;
        };
    }

    async function sendMessage(text: string) {
        if (!ws.value || !chatId || !user.value) return;

        const msg: Message = {
            id: nanoid(),
            chatId,
            senderId: user.value.id,
            text,
            timestamp: Date.now(),
        };

        await saveMessage(msg);
        ws.value.send(
            JSON.stringify({ type: "message", chatId, payload: msg })
        );
        messages.value.push(msg);
    }

    onUnmounted(() => ws.value?.close());

    return {
        chats,
        loadChats,
        createChat,
        connected,
        error,
        messages,
        connect,
        sendMessage,
    };
}
