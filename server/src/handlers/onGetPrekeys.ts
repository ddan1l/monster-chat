import { chatMemberRepository, deviceRepository } from "../container.js";

import type { GetPrekeysMessage, Peer } from "../types.js";
import type { ServerPrekeys } from "shared";

// Делят ли два аккаунта хотя бы один чат.
function sharesChat(a: string, b: string): boolean {
    return chatMemberRepository
        .getChatIds(a)
        .some((chatId) => chatMemberRepository.getMembers(chatId).includes(b));
}

// Отдаёт prekey всех устройств запрошенного аккаунта — отправитель зашифрует
// сообщение под каждый. Только для себя или со-участника чата (иначе — утечка
// числа устройств произвольного аккаунта, энумерация).
export function onGetPrekeys(ws: Peer, data: GetPrekeysMessage): void {
    if (!ws.signPubKey) {
        return;
    }
    const { signPubKey } = data.payload;
    if (
        signPubKey !== ws.signPubKey &&
        !sharesChat(ws.signPubKey, signPubKey)
    ) {
        return;
    }
    const reply: ServerPrekeys = {
        type: "prekeys",
        payload: {
            signPubKey,
            devices: deviceRepository.getPrekeys(signPubKey),
        },
    };
    ws.send(JSON.stringify(reply));
}
