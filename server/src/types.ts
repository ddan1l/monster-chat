import { WebSocket } from "ws";

import type { TokenBucket } from "./rateLimit.js";

export type Peer = WebSocket & {
    chatId?: string;
    signPubKey?: string;
    deviceId?: string; // устройство внутри аккаунта signPubKey (модель A)
    ip?: string;
    watchedPeers?: string[];
    authNonce?: string; // challenge, ожидающий подписи
    authed?: boolean; // владение ключом доказано
    msgBucket?: TokenBucket; // rate-limit персистирующих сообщений
};

export type {
    ClientMessage,
    AuthMessage,
    OpenChatMessage,
    OnlineMessage,
    InitChatMessage,
    ApproveChatMessage,
    KnockChatMessage,
    PeerInfoMessage,
    TypingMessage,
    StopTypingMessage,
    CancelChatMessage,
    MarkReadMessage,
    DeleteChatMessage,
    DeleteChatForAllMessage,
    PublishPrekeyMessage,
    GetPrekeysMessage,
    SendBundleMessage,
} from "shared";
