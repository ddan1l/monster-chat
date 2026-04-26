import type { ServerMessage } from "shared";
import type { Peer } from "../types.js";

export class NotificationService {
    send(peer: Peer, msg: ServerMessage): void {
        peer.send(JSON.stringify(msg));
    }
}
