// Messages sent from client to server
export interface JoinMessage {
    type: "join";
    roomId: string;
}

export interface OfferMessage {
    type: "offer";
    roomId: string;
    payload: RTCSessionDescriptionInit;
}

export interface AnswerMessage {
    type: "answer";
    roomId: string;
    payload: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage {
    type: "ice-candidate";
    roomId: string;
    payload: RTCIceCandidateInit;
}

export type ClientMessage =
    | JoinMessage
    | OfferMessage
    | AnswerMessage
    | IceCandidateMessage;

// Messages sent from server to client
export interface ServerOfferMessage {
    type: "offer";
    payload: RTCSessionDescriptionInit;
}

export interface ServerAnswerMessage {
    type: "answer";
    payload: RTCSessionDescriptionInit;
}

export interface ServerIceCandidateMessage {
    type: "ice-candidate";
    payload: RTCIceCandidateInit;
}

export type ServerMessage =
    | ServerOfferMessage
    | ServerAnswerMessage
    | ServerIceCandidateMessage;

export type SignalingType = "offer" | "answer" | "ice-candidate";
