import { useCrypto, fromBase64, toBase64 } from "@shared/crypto/useCrypto";

import { type DecryptedMessage } from "@entities/message/useMessages";

import type {
    ChatEnvelope,
    ChatMessage,
    MessageContent,
    PeerInfo,
} from "shared";

// Крипто-ядро сессии чата: производный ключ, расшифровка входящих и сборка
// подписанных исходящих. Инкапсулирует sharedKey/myKey/peerKey, чтобы
// оркестратор не таскал их вручную.
export function useChatCrypto(chatId: string) {
    const {
        exportSignPublicKey,
        deriveSharedKey,
        encrypt,
        decrypt,
        sign,
        verify,
    } = useCrypto();

    let sharedKey: CryptoKey | null = null;
    let myKey: string | null = null;
    let peerKey: string | null = null;

    // Устанавливаем собеседника: его ключ подписи и производный AES-ключ.
    async function initPeer(peerInfo: PeerInfo): Promise<void> {
        peerKey = peerInfo.signPubKey;
        sharedKey = await deriveSharedKey(fromBase64(peerInfo.ecdhPubKey));
    }

    async function loadMyKey(): Promise<void> {
        myKey = await exportSignPublicKey();
    }

    function ready(): boolean {
        return !!sharedKey && !!peerKey;
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

        // Отправителем может быть только один из двух участников чата —
        // мы сами (загрузка своей истории) или доверенный пир. Любой иной
        // ключ означает попытку выдать себя за участника.
        const trustedSender = msg.from === myKey || msg.from === peerKey;

        const valid =
            trustedSender &&
            (await verify(
                fromBase64(msg.from),
                envelopeBytes,
                fromBase64(msg.signature)
            ));

        if (!valid) {
            return { ...msg, text: "<i>Invalid message signature</i>" };
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
        const stored = msg as DecryptedMessage;
        return {
            ...msg,
            ...content,
            // Restore persisted metadata when loading from IDB
            ...(stored.editedAt !== undefined
                ? { editedAt: stored.editedAt, text: stored.text }
                : {}),
            ...(stored.isRead !== undefined ? { isRead: stored.isRead } : {}),
            ...(stored.isOwn !== undefined ? { isOwn: stored.isOwn } : {}),
        };
    }

    async function buildSignedMessage(
        content: MessageContent,
        silent?: boolean
    ): Promise<ChatMessage> {
        const nonce = crypto.randomUUID();
        const { payload, iv } = await encrypt(
            sharedKey!,
            JSON.stringify(content)
        );
        const from = await exportSignPublicKey();
        const envelope: ChatEnvelope = {
            chatId,
            from,
            to: peerKey!,
            nonce,
            iv: toBase64(iv),
            payload: toBase64(payload),
            timestamp: Date.now(),
        };
        const envelopeBytes = new TextEncoder().encode(
            JSON.stringify(envelope)
        );
        const signature = await sign(envelopeBytes);
        return {
            ...envelope,
            signature: toBase64(signature),
            ...(silent ? { silent: true } : {}),
        };
    }

    return { initPeer, loadMyKey, ready, decryptMessage, buildSignedMessage };
}
