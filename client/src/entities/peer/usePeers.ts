import { ref } from "vue";

import { PeerInfo } from "shared";

import { useWs } from "@shared/api/useWs";
import { useCrypto } from "@shared/crypto/useCrypto";
import { STORES, useIndexedDb } from "@shared/lib/useIndexedDb";

import { useUser } from "@entities/user/useUser";

export const peers = ref<Record<string, PeerInfo>>({});

export function usePeers() {
    const { read, write, remove } = useIndexedDb(STORES.PEERS);
    const { user, load: loadUser } = useUser();
    const { exportSignPublicKey, exportEncryptionPublicKey } = useCrypto();
    const { subscribe } = useWs();

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

    function startSync(): void {
        subscribe("peer_info", async (msg) => {
            const { chatId, ...peerInfo } = msg.payload;
            const stored = await read<{
                signPubKey: string;
                verified?: boolean;
                keyChanged?: boolean;
            }>(chatId);
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
    }

    return {
        removePeer,
        savePeer,
        getMyPeerInfo,
        startSync,
    };
}
