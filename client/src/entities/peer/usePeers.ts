import { ref } from "vue";

import { PeerInfo } from "shared";

import { useCrypto } from "@shared/crypto/useCrypto";
import { useDebounce } from "@shared/lib/useDebounce";
import { STORES, useIndexedDb } from "@shared/storage/useIndexedDb";
import { useWs } from "@shared/transport/useWs";

import { useUser } from "@entities/user/useUser";

export type StoredPeer = PeerInfo & {
    chatId: string;
    verified?: boolean;
    keyChanged?: boolean;
    lastSeen?: number;
};

export const peers = ref<Record<string, StoredPeer>>({});
export const onlineStatus = ref<Record<string, boolean>>({});
export const typingStatus = ref<Record<string, boolean>>({});

const typingDebouncers = new Map<string, ReturnType<typeof useDebounce>>();

export function usePeers() {
    const { read, readAll, write, remove } = useIndexedDb(STORES.PEERS);
    const { user, load: loadUser } = useUser();
    const { exportSignPublicKey, exportEncryptionPublicKey } = useCrypto();
    const { subscribe, send } = useWs();

    async function getMyPeerInfo() {
        if (!user.value) await loadUser();
        const [signPubKey, ecdhPubKey] = await Promise.all([
            exportSignPublicKey(),
            exportEncryptionPublicKey(),
        ]);
        return {
            signPubKey,
            ecdhPubKey,
            name: user.value!.name,
            avatar: user.value!.avatar,
        };
    }

    async function removePeer(chatId: string): Promise<void> {
        delete peers.value[chatId];
        return remove(chatId);
    }

    async function savePeer(peerInfo: PeerInfo, chatId: string): Promise<void> {
        const stored: StoredPeer = { ...peerInfo, chatId };
        peers.value[chatId] = stored;
        return write(stored, chatId);
    }

    async function loadAllPeers(): Promise<void> {
        const all = await readAll<StoredPeer>();
        for (const peer of all) {
            peers.value[peer.chatId] = peer;
        }
    }

    function chatIdByKey(signPubKey: string): string | undefined {
        return Object.keys(peers.value).find(
            (chatId) => peers.value[chatId]?.signPubKey === signPubKey
        );
    }

    // Объявляем серверу свой онлайн и список верифицированных собеседников,
    // которым его можно пересылать. Сервер — тупой релей, он не проверяет
    // верификацию; авторизация целиком на клиенте.
    async function announceOnline(): Promise<void> {
        const peerKeys = Object.values(peers.value)
            .filter((peer) => peer.verified && peer.signPubKey)
            .map((peer) => peer.signPubKey);

        send({ type: "online", payload: { peers: peerKeys } });
    }

    // Ре-шеринг при подключении: переотдаём личность собеседника каждого чата на
    // свой аккаунт, чтобы отставшие устройства (офлайн на момент approve или
    // привязанные позже) со временем сошлись. Сервер веером раздаёт своим.
    async function reshareOwnPeers(): Promise<void> {
        const mySignPubKey = await exportSignPublicKey();
        for (const stored of Object.values(peers.value)) {
            if (!stored.signPubKey) continue;
            send({
                type: "peer_info",
                payload: {
                    signPubKey: stored.signPubKey,
                    ecdhPubKey: stored.ecdhPubKey,
                    name: stored.name,
                    avatar: stored.avatar,
                    chatId: stored.chatId,
                    peerSignPubKey: mySignPubKey,
                    // Только апгрейд: делимся верификацией, но не сбрасываем чужую.
                    ...(stored.verified ? { verified: true } : {}),
                },
            });
        }
    }

    async function startSync(): Promise<void> {
        await loadAllPeers();
        subscribe("peer_info", async (msg) => {
            const { chatId, ...peerInfo } = msg.payload;
            const stored = await read<StoredPeer>(chatId);
            const keyRotated =
                !!stored?.signPubKey &&
                stored.signPubKey !== peerInfo.signPubKey;
            const updated: StoredPeer = keyRotated
                ? { ...peerInfo, chatId, verified: false, keyChanged: true }
                : { ...stored, ...peerInfo, chatId };
            await write(updated, chatId);
            peers.value[chatId] = updated;

            // Пришла верификация (синк со своего устройства) — переобъявляемся,
            // чтобы сервер узнал, что мы наблюдаем этого пира, и отдал его статус.
            if (updated.verified && !stored?.verified) announceOnline();
        });

        subscribe("peer_online", (msg) => {
            const chatId = chatIdByKey(msg.payload.signPubKey);
            if (!chatId || !peers.value[chatId]?.verified) return;
            const wasOnline = onlineStatus.value[chatId];
            onlineStatus.value[chatId] = true;
            // Отвечаем своим онлайном только на переход offline→online,
            // чтобы собеседник узнал о нас, не зациклив обмен.
            if (!wasOnline) announceOnline();
        });

        subscribe("peer_offline", (msg) => {
            const chatId = chatIdByKey(msg.payload.signPubKey);
            if (!chatId) return;
            onlineStatus.value[chatId] = false;
            const ts = msg.payload.lastSeen ?? Date.now();
            const updated = { ...peers.value[chatId], lastSeen: ts };
            peers.value[chatId] = updated;
            write(updated, chatId);
        });

        subscribe("peer_typing", (msg) => {
            const chatId = chatIdByKey(msg.payload.signPubKey);
            if (!chatId || !peers.value[chatId]?.verified) return;
            typingStatus.value[chatId] = true;
            if (!typingDebouncers.has(chatId)) {
                typingDebouncers.set(
                    chatId,
                    useDebounce(() => {
                        typingStatus.value[chatId] = false;
                    }, 3000)
                );
            }
            typingDebouncers.get(chatId)!.schedule();
        });

        subscribe("peer_stop_typing", (msg) => {
            const chatId = chatIdByKey(msg.payload.signPubKey);
            if (!chatId) return;
            typingStatus.value[chatId] = false;
            typingDebouncers.get(chatId)?.cancel();
        });
    }

    return {
        removePeer,
        savePeer,
        getMyPeerInfo,
        startSync,
        announceOnline,
        reshareOwnPeers,
    };
}
