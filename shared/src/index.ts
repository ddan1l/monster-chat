// Messages sent from client to server
export interface OpenChatMessage {
    type: "open_chat";
    payload: { chatId: string; signPubKey: string };
}

export interface SendMessage {
    type: "message";
    payload: ChatMessage;
}

export interface OnlineMessage {
    type: "online";
    payload: { signPubKey: string; peers: string[] };
}

export interface InitChatMessage {
    type: "init_chat";
    payload: { chatId: string; hostKey: string };
}

export interface ApproveChatMessage {
    type: "approve_chat";
    payload: { chatId: string; peerInfo: PeerInfo };
}

export interface KnockChatMessage {
    type: "knock_chat";
    payload: {
        chatId: string;
        hostKey: string;
        peerInfo: PeerInfo;
        timezone?: string;
    };
}

export interface PeerInfoMessage {
    type: "peer_info";
    payload: PeerInfo & { chatId: string; peerSignPubKey: string };
}

export interface TypingMessage {
    type: "typing";
    payload: { to: string[] };
}

export interface StopTypingMessage {
    type: "stop_typing";
    payload: { to: string[] };
}

export interface CancelChatMessage {
    type: "cancel_chat";
    payload: { chatId: string };
}

export type ClientMessage =
    | OpenChatMessage
    | SendMessage
    | OnlineMessage
    | InitChatMessage
    | ApproveChatMessage
    | KnockChatMessage
    | PeerInfoMessage
    | TypingMessage
    | StopTypingMessage
    | CancelChatMessage;

// Messages sent from server to client
export interface ServerMessageDelivery {
    type: "message";
    payload: ChatMessage;
}

export type NotificationType = "chat_notification";

export interface ServerNotification {
    type: "notification";
    payload: { chatId: string; notificationType: NotificationType };
}

export interface ServerChatOpened {
    type: "chat_opened";
}

export interface ServerError {
    type: "error";
    message: string;
}

export interface ServerChatCreated {
    type: "chat_created";
    payload: { chatId: string };
}

export interface ServerPeerInfo {
    type: "peer_info";
    payload: PeerInfo & { chatId: string };
}

export interface ServerChatKnock {
    type: "chat_knock";
    payload: {
        chatId: string;
        peerInfo: PeerInfo;
        ip?: string;
        region?: string;
        timezone?: string;
    };
}

export interface ServerPeerOnline {
    type: "peer_online";
    payload: { signPubKey: string };
}

export interface ServerPeerOffline {
    type: "peer_offline";
    payload: { signPubKey: string };
}

export interface ServerPeerTyping {
    type: "peer_typing";
    payload: { signPubKey: string };
}

export interface ServerPeerStopTyping {
    type: "peer_stop_typing";
    payload: { signPubKey: string };
}

export type ServerMessage =
    | ServerChatOpened
    | ServerChatCreated
    | ServerChatKnock
    | ServerPeerInfo
    | ServerMessageDelivery
    | ServerNotification
    | ServerError
    | ServerPeerOnline
    | ServerPeerOffline
    | ServerPeerTyping
    | ServerPeerStopTyping;

export interface Chat {
    id: string;
    isActive: boolean;
    joinLink?: string;
    createdAt: number;
}

export interface User {
    id: string;
    name: string;
    avatar: string;
}

export interface PeerInfo {
    signPubKey: string;
    ecdhPubKey: string;
    name: string;
    avatar?: string;
}

export interface PendingKnockInfo {
    chatId: string;
    peerInfo: PeerInfo;
    ip?: string;
    region?: string;
    timezone?: string;
}

export interface FileAttachment {
    url: string;
    key: string; // base64 AES-256-GCM key
    iv: string; // base64 IV
    name: string;
    size: number;
    mimeType: string;
}

export type MessageAction = "edit_message" | "delete_message" | "read_message";

export interface MessageContent {
    text?: string;
    files?: FileAttachment[];
    action?: MessageAction;
    targetNonce?: string;
}

export interface ChatEnvelope {
    chatId: string;
    from: string;
    to: string;
    nonce: string;
    iv: string; // base64
    payload: string; // base64, encrypted MessageContent
    timestamp: number;
}

export interface ChatMessage extends ChatEnvelope {
    signature: string; // base64
    isAction?: boolean;
}
