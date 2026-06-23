import { WebSocket } from "ws";

export type Peer = WebSocket & {
    chatId?: string;
    signPubKey?: string;
    ip?: string;
    watchedPeers?: string[];
};

export type {
    ClientMessage,
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
} from "shared";
