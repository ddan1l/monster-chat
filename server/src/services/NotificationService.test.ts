import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { UserEventSQLiteQueue } from "../queues/UserEventSQLiteQueue.js";
import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import { DeviceSQLiteRepository } from "../repositories/DeviceSQLiteRepository.js";
import { fakePeer } from "../testHelpers.js";

import { NotificationService } from "./NotificationService.js";

import type { PushSubscriptionRepository } from "../repositories/PushSubscriptionRepository.js";

function setup() {
    const db = new Database(":memory:");
    const conns = new ConnectionInMemoryRepository();
    const devices = new DeviceSQLiteRepository(db);
    const queue = new UserEventSQLiteQueue(db);
    const push = {} as unknown as PushSubscriptionRepository;
    const svc = new NotificationService(conns, queue, push, devices);
    return { svc, conns, devices, queue };
}

const EVENT = { type: "chat_deleted", payload: { chatId: "c1" } } as const;

test("deliverToAccount: online device gets it live, offline device gets it queued", () => {
    const { svc, conns, devices, queue } = setup();
    devices.add("B", "d1");
    devices.add("B", "d2"); // d2 офлайн — нет соединения
    const sent: string[] = [];
    const online = fakePeer({
        signPubKey: "B",
        deviceId: "d1",
        send: (s: string) => sent.push(JSON.parse(s).type),
    });
    conns.set("B", "d1", online);

    svc.deliverToAccount("B", EVENT);

    // d1 — вживую, d2 — в его очередь; d1 при этом в очередь не попал.
    assert.deepEqual(sent, ["chat_deleted"]);
    assert.deepEqual(
        queue.flush("B", "d2").map((e) => e.type),
        ["chat_deleted"]
    );
    assert.deepEqual(queue.flush("B", "d1"), []);
});

test("deliverToAccount: no known devices → account-fallback queue", () => {
    const { svc, queue } = setup();
    svc.deliverToAccount("B", EVENT);
    // Заберётся любым первым устройством (device_id '').
    assert.deepEqual(
        queue.flush("B", "anydevice").map((e) => e.type),
        ["chat_deleted"]
    );
});

test("fanLive: only to online devices, nothing queued", () => {
    const { svc, conns, devices, queue } = setup();
    devices.add("B", "d1");
    devices.add("B", "d2");
    const sent: string[] = [];
    const online = fakePeer({
        signPubKey: "B",
        deviceId: "d1",
        send: (s: string) => sent.push(JSON.parse(s).type),
    });
    conns.set("B", "d1", online);

    svc.fanLive("B", { type: "peer_online", payload: { signPubKey: "A" } });

    assert.deepEqual(sent, ["peer_online"]);
    assert.deepEqual(queue.flush("B", "d2"), []); // presence не очередится
});
