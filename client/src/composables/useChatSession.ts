import { ref, watch, onUnmounted } from "vue";
import type {
    Chat,
    ChatEnvelope,
    ChatMessage,
    MessageContent,
    PeerInfo,
} from "shared";
import { useIndexedDb, STORES } from "./useIndexedDb";
import { useCrypto, fromBase64, toBase64 } from "./useCrypto";
import { useChatMessages } from "./useMessages";
import { useUser } from "./useUser";
import { useWs } from "./useWs";
import { chats } from "./useChats";

export interface DecryptedMessage extends ChatMessage, MessageContent {}

export function useChatSession(chatId: string) {
    const { read } = useIndexedDb(STORES.CHATS);
    const { read: readPeer } = useIndexedDb(STORES.PEERS);
    const { saveChatMessage, getByChat } = useChatMessages();
    const { user, load: loadUser } = useUser();
    const { send: wsSend, subscribe } = useWs();
    const {
        exportSignPublicKey,
        deriveSharedKey,
        encrypt,
        decrypt,
        sign,
        verify,
    } = useCrypto();

    const chat = ref<Chat | null>(null);
    const peer = ref<PeerInfo | null>(null);
    const messages = ref<DecryptedMessage[]>([]);
    const error = ref<string | null>(null);
    let sharedKey: CryptoKey | null = null;

    const unsubs: (() => void)[] = [];
    const on: typeof subscribe = (type, handler) => {
        const unsub = subscribe(type, handler);
        unsubs.push(unsub);
        return unsub;
    };

    onUnmounted(() => unsubs.forEach((fn) => fn()));

    async function initSharedKey(ecdhPubKey: string): Promise<void> {
        sharedKey = await deriveSharedKey(fromBase64(ecdhPubKey));
    }

    async function decryptMessage(msg: ChatMessage): Promise<DecryptedMessage> {
        const envelope: ChatEnvelope = {
            chatId: msg.chatId,
            from: msg.from,
            to: msg.to,
            nonce: msg.nonce,
            iv: msg.iv,
            payload: msg.payload,
            timestamp: msg.timestamp,
        };

        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const valid = await verify(
            fromBase64(msg.from),
            envelopeBytes,
            fromBase64(msg.signature)
        );

        if (!valid) {
            return { ...msg, text: "Invalid message signature" };
        }
        if (!sharedKey) {
            throw new Error("Shared key not initialized");
        }

        const decrypted = await decrypt(
            sharedKey,
            fromBase64(msg.payload),
            new Uint8Array(fromBase64(msg.iv))
        );

        const content: MessageContent = JSON.parse(decrypted);
        return { ...msg, ...content };
    }

    function addMessage(msg: DecryptedMessage): void {
        saveChatMessage(msg);
        messages.value.push(msg);
    }

    async function sendMessage(text: string, files?: string[]): Promise<void> {
        if (!user.value || !peer.value || !sharedKey) return;

        const content: MessageContent = {
            text,
            ...(files?.length ? { files } : {}),
        };
        const nonce = crypto.randomUUID();
        const { payload, iv } = await encrypt(
            sharedKey,
            JSON.stringify(content)
        );
        const from = await exportSignPublicKey();

        const envelope: ChatEnvelope = {
            chatId,
            from,
            to: peer.value.signPubKey,
            nonce,
            iv: toBase64(iv),
            payload: toBase64(payload),
            timestamp: Date.now(),
        };

        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const signature = await sign(envelopeBytes);

        const msg: ChatMessage = {
            ...envelope,
            signature: toBase64(signature),
        };

        wsSend({ type: "message", payload: msg });
        addMessage({ ...msg, ...content });
    }

    async function connect(): Promise<void> {
        on("error", (msg) => {
            error.value = msg.message;
        });

        on("message", async (msg) => {
            addMessage(await decryptMessage(msg.payload));
        });

        on("peer_info", async (msg) => {
            const { chatId: msgChatId, ...peerInfo } = msg.payload;
            if (msgChatId === chatId) {
                peer.value = peerInfo;
                await initSharedKey(peerInfo.ecdhPubKey);
            }
        });

        if (!user.value) await loadUser();

        const [loadedChat, loadedPeer] = await Promise.all([
            read<Chat>(chatId),
            readPeer<PeerInfo>(chatId),
        ]);

        chat.value = loadedChat;
        peer.value = loadedPeer;

        if (loadedChat && !chats.value.find((c) => c.id === chatId)) {
            chats.value.push(loadedChat);
        }

        unsubs.push(
            watch(
                () => chats.value.find((c) => c.id === chatId)?.isActive,
                async (isActive) => {
                    if (!isActive) return;

                    const [signPubKey, msgs, activePeer] = await Promise.all([
                        exportSignPublicKey(),
                        getByChat(chatId),
                        readPeer<PeerInfo>(chatId),
                    ]);

                    chat.value =
                        chats.value.find((c) => c.id === chatId) ?? null;
                    peer.value = activePeer;

                    if (activePeer) await initSharedKey(activePeer.ecdhPubKey);

                    messages.value = await Promise.all(
                        msgs.map(decryptMessage)
                    );

                    wsSend({
                        type: "open_chat",
                        payload: { chatId, signPubKey },
                    });
                },
                { immediate: true }
            )
        );
    }

    return {
        chat,
        peer,
        messages,
        error,
        connect,
        sendMessage,
    };
}
