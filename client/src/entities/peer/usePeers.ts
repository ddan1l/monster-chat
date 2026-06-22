import { ref } from "vue";

import { PeerInfo } from "shared";

import { useWs } from "@shared/api/useWs";
import { useCrypto } from "@shared/crypto/useCrypto";
import { useDebounce } from "@shared/lib/useDebounce";
import { STORES, useIndexedDb } from "@shared/lib/useIndexedDb";

import { useUser } from "@entities/user/useUser";

export type StoredPeer = PeerInfo & {
    verified?: boolean;
    keyChanged?: boolean;
};

export const peers = ref<Record<string, StoredPeer>>({});
export const onlineStatus = ref<Record<string, boolean>>({});
export const typingStatus = ref<Record<string, boolean>>({});

const typingDebouncers = new Map<string, ReturnType<typeof useDebounce>>();

export function usePeers() {
    const { read, write, remove } = useIndexedDb(STORES.PEERS);
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
        peers.value[chatId] = peerInfo;
        return write(peerInfo, chatId);
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
        const signPubKey = await exportSignPublicKey();
        const peerKeys = Object.values(peers.value)
            .filter((peer) => peer.verified && peer.signPubKey)
            .map((peer) => peer.signPubKey);

        send({ type: "online", payload: { signPubKey, peers: peerKeys } });
    }

    function startSync(): void {
        subscribe("peer_info", async (msg) => {
            const { chatId, ...peerInfo } = msg.payload;
            const stored = await read<StoredPeer>(chatId);
            if (stored && stored.signPubKey !== peerInfo.signPubKey) {
                await write(
                    { ...peerInfo, verified: false, keyChanged: true },
                    chatId
                );
            } else {
                await write(peerInfo, chatId);
            }
            peers.value[chatId] = peerInfo;
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
    };
}
