import { WebSocket } from "ws";

export type Peer = WebSocket & {
    chatId?: string;
    signPubKey?: string;
    ip?: string;
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
    ReadReceiptMessage,
    TypingMessage,
    StopTypingMessage,
    DeleteMessageMessage,
    DeleteChatMessage,
    CancelChatMessage,
} from "shared";
