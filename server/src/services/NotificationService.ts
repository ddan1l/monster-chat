import type { Peer } from "../types.js";
import type { ServerMessage } from "shared";

export class NotificationService {
    send(peer: Peer, msg: ServerMessage): void {
        peer.send(JSON.stringify(msg));
    }
}
