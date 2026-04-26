// Messages sent from server to client
export interface ServerMessageDelivery {
    type: "message";
    payload: Message;
}

export interface ServerNotification {
    type: "notification";
    payload: Message;
}

export interface ServerJoined {
    type: "joined";
}

export interface ServerError {
    type: "error";
    message: string;
}

export type ServerMessage =
    | ServerJoined
    | ServerMessageDelivery
    | ServerNotification
    | ServerError;

export interface Chat {
    id: string;
    link: string;
    createdAt: number;
}

export interface User {
    id: string;
    name: string;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: number;
}
