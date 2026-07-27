import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { makeMsg } from "../testHelpers.js";

import { MessageSQLiteRepository } from "./MessageSQLiteRepository.js";

function repo() {
    return new MessageSQLiteRepository(new Database(":memory:"));
}

test("save assigns a monotonic seq", () => {
    const r = repo();
    const m1 = makeMsg({ from: "A", to: "B", targetDeviceId: "d1" });
    const m2 = makeMsg({ from: "B", to: "A", targetDeviceId: "d1" });
    r.save(m1);
    r.save(m2);
    assert.equal(m1.seq, 1);
    assert.equal(m2.seq, 2);
});

test("save is idempotent by (nonce, target) and keeps the original seq", () => {
    const r = repo();
    const m = makeMsg({ targetDeviceId: "d1" });
    r.save(m);
    const firstSeq = m.seq;
    const dup = { ...m };
    r.save(dup);
    assert.equal(dup.seq, firstSeq); // повтор не создаёт новую строку
});

test("removeByChat wipes the chat", () => {
    const r = repo();
    r.save(makeMsg({ targetDeviceId: "d1" }));
    r.removeByChat("c1");
    assert.equal(r.getAfterForDevice("c1", "d1", 0).length, 0);
});

test("v2: same nonce, different target devices are stored separately", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B", nonce: "n1", targetDeviceId: "d1" }));
    r.save(makeMsg({ from: "A", to: "B", nonce: "n1", targetDeviceId: "d2" }));
    // Обе копии сохранены (уникальность по (nonce, target_device_id)).
    assert.equal(r.getAfterForDevice("c1", "d1", 0).length, 1);
    assert.equal(r.getAfterForDevice("c1", "d2", 0).length, 1);
});

test("deleteDeviceDeliveredUpTo removes a device's copies up to the cursor", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B", nonce: "n1", targetDeviceId: "d1" }));
    r.save(makeMsg({ from: "A", to: "B", nonce: "n2", targetDeviceId: "d1" }));
    r.save(makeMsg({ from: "A", to: "B", nonce: "n3", targetDeviceId: "d1" }));
    r.save(makeMsg({ from: "A", to: "B", nonce: "n1", targetDeviceId: "d2" }));

    r.deleteDeviceDeliveredUpTo("c1", "d1", 2); // seq <= 2 у d1

    assert.deepEqual(
        r.getAfterForDevice("c1", "d1", 0).map((m) => m.seq),
        [3]
    );
    assert.equal(r.getAfterForDevice("c1", "d2", 0).length, 1); // чужие не тронуты
});

test("deleteExpired removes messages older than the cutoff", () => {
    const r = repo();
    r.save(makeMsg({ nonce: "old", targetDeviceId: "d1", timestamp: 1000 }));
    r.save(makeMsg({ nonce: "new", targetDeviceId: "d1", timestamp: 5000 }));

    r.deleteExpired(3000);

    const left = r.getAfterForDevice("c1", "d1", 0);
    assert.equal(left.length, 1);
    assert.equal(left[0].nonce, "new");
});
