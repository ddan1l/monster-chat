import { WebSocket } from "ws";

export type Peer = WebSocket & { chatId?: string; signPubKey?: string };

export type { ClientMessage, OpenChatMessage, SendMessage, OnlineMessage, InitChatMessage, ApproveChatMessage, KnockChatMessage, PeerInfoMessage } from "shared";
