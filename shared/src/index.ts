// Messages sent from client to server
export interface AuthMessage {
    type: "auth";
    payload: { signPubKey: string; signature: string }; // подпись challenge-nonce
}

export interface OpenChatMessage {
    type: "open_chat";
    payload: { chatId: string; afterSeq?: number };
}

export interface SendMessage {
    type: "message";
    payload: ChatMessage;
}

export interface OnlineMessage {
    type: "online";
    payload: { peers: string[] };
}

export interface InitChatMessage {
    type: "init_chat";
    payload: { chatId: string };
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

export interface MarkReadMessage {
    type: "mark_read";
    payload: { chatId: string };
}

export interface DeleteChatMessage {
    type: "delete_chat";
    payload: { chatId: string };
}

export interface DeleteChatForAllMessage {
    type: "delete_chat_for_all";
    payload: { chatId: string };
}

export interface PingMessage {
    type: "ping";
    payload: { ts: number };
}

export interface SetAwayMessage {
    type: "set_away";
}

export interface SetOnlineMessage {
    type: "set_online";
}

export type ClientMessage =
    | AuthMessage
    | OpenChatMessage
    | SendMessage
    | OnlineMessage
    | InitChatMessage
    | ApproveChatMessage
    | KnockChatMessage
    | PeerInfoMessage
    | TypingMessage
    | StopTypingMessage
    | CancelChatMessage
    | MarkReadMessage
    | DeleteChatMessage
    | DeleteChatForAllMessage
    | PingMessage
    | SetAwayMessage
    | SetOnlineMessage;

// Messages sent from server to client
export interface ServerMessageDelivery {
    type: "message";
    payload: ChatMessage;
}

export type NotificationType = "chat_notification";

export interface ServerNotification {
    type: "notification";
    payload: {
        chatId: string;
        notificationType: NotificationType;
        silent?: boolean;
        unreadCount?: number;
    };
}

export interface ServerUnread {
    type: "unread";
    payload: { counts: Record<string, number> };
}

export interface ServerChatDestroyed {
    type: "chat_destroyed";
    payload: { chatId: string };
}

export interface ServerChatDeleted {
    type: "chat_deleted";
    payload: { chatId: string };
}

// Подтверждение, что сообщение записано на сервере (для outbox отправителя).
export interface ServerAck {
    type: "ack";
    payload: { nonce: string; seq: number };
}

// Challenge для proof-of-possession: клиент подписывает nonce своим ключом.
export interface ServerChallenge {
    type: "challenge";
    payload: { nonce: string };
}

// Аутентификация пройдена — клиент может слать остальные сообщения.
export interface ServerAuthed {
    type: "authed";
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
    payload: { signPubKey: string; lastSeen?: number };
}

export interface ServerPeerTyping {
    type: "peer_typing";
    payload: { signPubKey: string };
}

export interface ServerPeerStopTyping {
    type: "peer_stop_typing";
    payload: { signPubKey: string };
}

export interface ServerPong {
    type: "pong";
    payload: { ts: number };
}

export interface ServerChatList {
    type: "chat_list";
    // lefted — чаты, где остался только текущий пользователь (собеседник
    // удалил чат у себя). У них клиент держит read-only даже после переустановки.
    payload: { chatIds: string[]; lefted: string[] };
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
    | ServerPeerStopTyping
    | ServerPong
    | ServerChatList
    | ServerUnread
    | ServerChatDestroyed
    | ServerChatDeleted
    | ServerAck
    | ServerChallenge
    | ServerAuthed;

export interface Chat {
    id: string;
    // Оба участника присоединились (handshake завершён approve_chat).
    established: boolean;
    joinLink?: string;
    createdAt: number;
    // Собеседник покинул чат (удалил у себя): историю читать можно, писать нельзя.
    lefted?: boolean;
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
    silent?: boolean;
    // Серверный монотонный курсор (rowid). Проставляется сервером при приёме,
    // в подпись конверта не входит. Клиент использует его для синхронизации.
    seq?: number;
}
