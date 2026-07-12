import { WebSocket } from "ws";

export type Peer = WebSocket & {
    chatId?: string;
    signPubKey?: string;
    ip?: string;
    watchedPeers?: string[];
    authNonce?: string; // challenge, ожидающий подписи
    authed?: boolean; // владение ключом доказано
};

export type {
    ClientMessage,
    AuthMessage,
    OpenChatMessage,
    SendMessage,
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
} from "shared";
