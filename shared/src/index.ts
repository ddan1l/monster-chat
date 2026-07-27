// Messages sent from client to server
export interface AuthMessage {
    type: "auth";
    // подпись challenge-nonce + идентификатор устройства (модель A: один аккаунт
    // signPubKey, много устройств — deviceId различает соединения/очереди).
    payload: { signPubKey: string; signature: string; deviceId: string };
}

export interface OpenChatMessage {
    type: "open_chat";
    payload: { chatId: string; afterSeq?: number };
}

export interface SendMessage {
    type: "message";
    payload: ChatMessage;
}

// v2 (FS): одно логическое сообщение = N per-device копий. Отправитель шлёт их
// одним бандлом; сервер разворачивает в per-device конверты и хранит по паре
// (nonce, targetDeviceId). nonce общий — логический id для дедупа/правок.
export interface MessageCopy {
    targetDeviceId: string;
    epochId: number;
    ephemeralPub: string; // base64 raw ECDH pub эфемерного ключа отправителя
    iv: string;
    payload: string; // base64, зашифровано ECIES-ключом под prekey устройства
    signature: string; // base64, подпись конверта этой копии
}

export interface MessageBundle {
    chatId: string;
    from: string;
    to: string;
    nonce: string;
    timestamp: number;
    silent?: boolean;
    copies: MessageCopy[];
}

export interface SendBundleMessage {
    type: "message_bundle";
    payload: MessageBundle;
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
    // verified — синк статуса верификации между СВОИМИ устройствами (safety
    // number считается по общим identity-ключам, поэтому валиден для всех).
    payload: PeerInfo & {
        chatId: string;
        peerSignPubKey: string;
        verified?: boolean;
    };
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

// Публикация текущего эпохального prekey устройства (FS, Фаза 4). epochPub
// подписан identity-sign-ключом — получатель доверяет ему как ключу аккаунта.
export interface PublishPrekeyMessage {
    type: "publish_prekey";
    payload: { epochId: number; epochPub: string; signature: string };
}

// Запрос prekey всех устройств аккаунта — отправитель шифрует под каждый.
export interface GetPrekeysMessage {
    type: "get_prekeys";
    payload: { signPubKey: string };
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
    | SetOnlineMessage
    | PublishPrekeyMessage
    | GetPrekeysMessage
    | SendBundleMessage;

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

// Эпохальный prekey одного устройства (FS, Фаза 4).
export interface DevicePrekey {
    deviceId: string;
    epochId: number;
    epochPub: string; // base64 raw ECDH-публичный ключ эпохи
    signature: string; // base64, подпись epochPub identity-sign-ключом аккаунта
}

// Ответ на get_prekeys: текущие prekey всех устройств аккаунта.
export interface ServerPrekeys {
    type: "prekeys";
    payload: { signPubKey: string; devices: DevicePrekey[] };
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
    payload: PeerInfo & { chatId: string; verified?: boolean };
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
    | ServerPrekeys
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
    // v2 (FS): конверт адресован конкретному устройству, payload зашифрован под
    // его эпохальный prekey эфемерным ключом отправителя. Отсутствие v2-полей =
    // v1 (статический sharedKey).
    v?: 2;
    targetDeviceId?: string;
    epochId?: number;
    ephemeralPub?: string; // base64 raw ECDH pub эфемерного ключа отправителя
}
