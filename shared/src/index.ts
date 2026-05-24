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
    payload: { signPubKey: string };
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
    };
}

export interface PeerInfoMessage {
    type: "peer_info";
    payload: PeerInfo & { chatId: string };
}

export interface ReadReceiptMessage {
    type: "read_receipt";
    payload: { chatId: string; nonce: string };
}

export type ClientMessage =
    | OpenChatMessage
    | SendMessage
    | OnlineMessage
    | InitChatMessage
    | ApproveChatMessage
    | KnockChatMessage
    | PeerInfoMessage
    | ReadReceiptMessage;

// Messages sent from server to client
export interface ServerMessageDelivery {
    type: "message";
    payload: ChatMessage;
}

export interface ServerNotification {
    type: "notification";
    payload: ChatMessage;
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
    payload: { chatId: string; peerInfo: PeerInfo };
}

export interface ServerReadReceipt {
    type: "read_receipt";
    payload: { chatId: string; nonce: string };
}

export type ServerMessage =
    | ServerChatOpened
    | ServerChatCreated
    | ServerChatKnock
    | ServerPeerInfo
    | ServerMessageDelivery
    | ServerNotification
    | ServerError
    | ServerReadReceipt;

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

export interface MessageContent {
    text: string;
    files?: string[]; // base64[]
    originalNonce?: string;
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
}
