import { useCrypto, fromBase64, toBase64 } from "@shared/crypto/useCrypto";
import { getDeviceId } from "@shared/lib/useDeviceId";

import { type DecryptedMessage } from "@entities/message/useMessages";

import { useEpochKeys } from "@features/auth/useEpochKeys";
import { usePrekeys } from "@features/auth/usePrekeys";

import type {
    ChatMessage,
    MessageBundle,
    MessageContent,
    MessageCopy,
    PeerInfo,
} from "shared";

// Канонические байты копии для подписи/проверки. Порядок полей фиксирован —
// отправитель и получатель строят объект одинаково.
function copyCanonical(f: {
    chatId: string;
    from: string;
    to: string;
    nonce: string;
    timestamp: number;
    targetDeviceId: string;
    epochId: number;
    ephemeralPub: string;
    iv: string;
    payload: string;
    silent: boolean;
}): Uint8Array<ArrayBuffer> {
    return new TextEncoder().encode(JSON.stringify(f));
}

// Крипто-ядро сессии чата: сборка/расшифровка сообщений (ECIES под эпохальные
// prekey устройств) + проверка подписи. Инкапсулирует myKey/peerKey.
export function useChatCrypto(chatId: string) {
    const {
        exportSignPublicKey,
        deriveKeyWith,
        encrypt,
        decrypt,
        sign,
        verify: verifySignature,
    } = useCrypto();
    const { loadEpoch } = useEpochKeys();
    const { fetchPrekeys } = usePrekeys();

    let myKey: string | null = null;
    let peerKey: string | null = null;

    // Устанавливаем собеседника — его identity-ключ (для проверки подписи).
    async function initPeer(peerInfo: PeerInfo): Promise<void> {
        peerKey = peerInfo.signPubKey;
    }

    async function loadMyKey(): Promise<void> {
        myKey = await exportSignPublicKey();
    }

    function ready(): boolean {
        return !!peerKey;
    }

    // Собирает бандл — по копии на каждое устройство получателя и на
    // свои другие устройства. Для каждого: ECIES под его эпохальный prekey
    // эфемерным ключом (тут же выбрасывается) + подпись копии.
    async function buildBundle(
        content: MessageContent,
        silent?: boolean
    ): Promise<MessageBundle> {
        const nonce = crypto.randomUUID();
        const timestamp = Date.now();
        const from = await exportSignPublicKey();
        const to = peerKey!;
        const contentStr = JSON.stringify(content);
        const myDeviceId = getDeviceId();

        const [peerDevices, myDevices] = await Promise.all([
            fetchPrekeys(to),
            fetchPrekeys(from),
        ]);
        const targets = [
            ...peerDevices.map((p) => ({ p, owner: to })),
            ...myDevices
                .filter((p) => p.deviceId !== myDeviceId)
                .map((p) => ({ p, owner: from })),
        ];

        const copies: MessageCopy[] = [];
        for (const { p, owner } of targets) {
            const epochPubRaw = fromBase64(p.epochPub);
            // Проверяем, что prekey подписан identity-ключом владельца — иначе
            // сервер мог подсунуть чужой ключ; такое устройство пропускаем.
            const authentic = await verifySignature(
                fromBase64(owner),
                epochPubRaw,
                fromBase64(p.signature)
            );
            if (!authentic) continue;

            const ephemeral = await crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey"]
            );
            const msgKey = await deriveKeyWith(
                ephemeral.privateKey,
                epochPubRaw
            );
            const { payload, iv } = await encrypt(msgKey, contentStr);
            const ephemeralPubRaw = await crypto.subtle.exportKey(
                "raw",
                ephemeral.publicKey
            );
            const fields = {
                chatId,
                from,
                to,
                nonce,
                timestamp,
                targetDeviceId: p.deviceId,
                epochId: p.epochId,
                ephemeralPub: toBase64(ephemeralPubRaw),
                iv: toBase64(iv),
                payload: toBase64(payload),
                silent: !!silent,
            };
            const signature = await sign(copyCanonical(fields));
            copies.push({
                targetDeviceId: fields.targetDeviceId,
                epochId: fields.epochId,
                ephemeralPub: fields.ephemeralPub,
                iv: fields.iv,
                payload: fields.payload,
                signature: toBase64(signature),
            });
        }

        return {
            chatId,
            from,
            to,
            nonce,
            timestamp,
            ...(silent ? { silent: true } : {}),
            copies,
        };
    }

    // v2: расшифровка своей копии — проверка подписи + ECIES своим эпохальным
    // приватником (по epochId) и эфемерным публичным ключом отправителя.
    async function decryptV2(msg: ChatMessage): Promise<DecryptedMessage> {
        const trustedSender = msg.from === myKey || msg.from === peerKey;
        const fields = {
            chatId: msg.chatId,
            from: msg.from,
            to: msg.to,
            nonce: msg.nonce,
            timestamp: msg.timestamp,
            targetDeviceId: msg.targetDeviceId ?? "",
            epochId: msg.epochId ?? 0,
            ephemeralPub: msg.ephemeralPub ?? "",
            iv: msg.iv,
            payload: msg.payload,
            silent: msg.silent ?? false,
        };
        const valid =
            trustedSender &&
            (await verifySignature(
                fromBase64(msg.from),
                copyCanonical(fields),
                fromBase64(msg.signature)
            ));
        if (!valid) {
            return { ...msg, text: "<i>Invalid message signature</i>" };
        }

        let keyPair: CryptoKeyPair;
        try {
            keyPair = await loadEpoch(msg.epochId ?? 0);
        } catch {
            // Эпоха уничтожена ротацией — сообщение под ней уже не вскрыть (FS).
            return { ...msg, text: "<i>Сообщение недоступно</i>" };
        }
        const msgKey = await deriveKeyWith(
            keyPair.privateKey,
            fromBase64(msg.ephemeralPub ?? "")
        );
        const decrypted = await decrypt(
            msgKey,
            fromBase64(msg.payload),
            new Uint8Array(fromBase64(msg.iv))
        );
        return { ...msg, ...(JSON.parse(decrypted) as MessageContent) };
    }

    return {
        initPeer,
        loadMyKey,
        ready,
        decryptV2,
        buildBundle,
    };
}
