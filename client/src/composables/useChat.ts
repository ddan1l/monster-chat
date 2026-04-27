import { ref } from "vue";
import { nanoid } from "nanoid";
import type { Chat, Message } from "shared";
import { useIndexedDb, STORES } from "./useIndexedDb";
import { useMessages } from "./useMessages";
import { useUser } from "./useUser";
import { useWs } from "./useWs";

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

    const connected = ref(false);
    const error = ref<string | null>(null);
    const messages = ref<Message[]>([]);
    const { saveMessage, getByChat } = useMessages();
    const { user, load: loadUser } = useUser();
    const { connect: wsConnect, send: wsSend, close: wsClose } = useWs();

    async function connect() {
        if (!chatId) return;

        if (!user.value) await loadUser();
        messages.value = await getByChat(chatId);

        wsConnect(
            () => wsSend({ type: "join", chatId, userId: user.value!.id }),
            async (msg) => {
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
                    wsClose();
                    return;
                }

                if (msg.type !== "message") return;
                await saveMessage(msg.payload);
                messages.value.push(msg.payload);
            },
            () => {
                connected.value = false;
            }
        );
    }

    async function sendMessage(text: string) {
        if (!chatId || !user.value) return;

        const msg: Message = {
            id: nanoid(),
            chatId,
            senderId: user.value.id,
            text,
            timestamp: Date.now(),
        };

        await saveMessage(msg);
        wsSend({ type: "message", chatId, payload: msg });
        messages.value.push(msg);
    }

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
