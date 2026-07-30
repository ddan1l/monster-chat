import { chatService } from "../container.js";

import type { PeerInfoMessage, Peer } from "../types.js";

export function onPeerInfo(ws: Peer, data: PeerInfoMessage): void {
    const { chatId, peerSignPubKey, ...peerInfo } = data.payload;
    // Синк между СВОИМИ устройствами (target = свой аккаунт): можно переотдать
    // личность собеседника, чтобы устройства сошлись — свои устройства и так
    // делят identity-ключ, новых рисков нет.
    const toOwnAccount = peerSignPubKey === ws.signPubKey;
    // Обычный relay наружу: пересылать можно только СВОЮ личность.
    if (!toOwnAccount && peerInfo.signPubKey !== ws.signPubKey) {
        return;
    }
    chatService.relayPeerInfo(chatId, peerInfo, peerSignPubKey);
}
