import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { makeMsg } from "../testHelpers.js";

import { MessageSQLiteRepository } from "./MessageSQLiteRepository.js";

function repo() {
    return new MessageSQLiteRepository(new Database(":memory:"));
}

test("save assigns a monotonic seq and getMaxSeq tracks it", () => {
    const r = repo();
    const m1 = makeMsg({ from: "A", to: "B" });
    const m2 = makeMsg({ from: "B", to: "A" });
    r.save(m1);
    r.save(m2);
    assert.equal(m1.seq, 1);
    assert.equal(m2.seq, 2);
    assert.equal(r.getMaxSeq("c1"), 2);
});

test("save is idempotent by nonce and keeps the original seq", () => {
    const r = repo();
    const m = makeMsg();
    r.save(m);
    const firstSeq = m.seq;
    const dup = { ...m };
    r.save(dup);
    assert.equal(dup.seq, firstSeq); // повтор не создаёт новую строку
    assert.equal(r.getMaxSeq("c1"), firstSeq);
});

test("getAfter returns messages where user is sender or recipient, seq > cursor", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B" })); // seq 1
    r.save(makeMsg({ from: "B", to: "A" })); // seq 2
    r.save(makeMsg({ from: "X", to: "Y" })); // seq 3 — чужой чат-участник

    const forA = r.getAfter("c1", "A", 0);
    assert.deepEqual(
        forA.map((m) => m.seq),
        [1, 2]
    );
    assert.deepEqual(
        r.getAfter("c1", "A", 1).map((m) => m.seq),
        [2]
    );
});

test("countUnread counts only messages addressed to the user above the cursor", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B" })); // seq 1 → unread for B
    r.save(makeMsg({ from: "B", to: "A" })); // seq 2 → not for B
    r.save(makeMsg({ from: "A", to: "B" })); // seq 3 → unread for B

    assert.equal(r.countUnread("c1", "B", 0), 2);
    assert.equal(r.countUnread("c1", "B", 1), 1); // курсор после seq1
    assert.equal(r.countUnread("c1", "A", 0), 1); // только seq2 адресовано A
});

test("countUnread excludes silent messages (edits/reads/deletes)", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B" })); // видимое
    r.save(makeMsg({ from: "A", to: "B", silent: true })); // квитанция/правка
    assert.equal(r.countUnread("c1", "B", 0), 1);
});

test("removeByChat wipes the chat", () => {
    const r = repo();
    r.save(makeMsg());
    r.removeByChat("c1");
    assert.equal(r.getMaxSeq("c1"), 0);
    assert.equal(r.getAfter("c1", "B", 0).length, 0);
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
    r.save(makeMsg({ from: "A", to: "B", nonce: "old", timestamp: 1000 }));
    r.save(makeMsg({ from: "A", to: "B", nonce: "new", timestamp: 5000 }));

    r.deleteExpired(3000);

    const left = r.getAfter("c1", "A", 0);
    assert.equal(left.length, 1);
    assert.equal(left[0].nonce, "new");
});

test("v2 device-scoped queries ignore v1 rows and vice versa", () => {
    const r = repo();
    r.save(makeMsg({ from: "A", to: "B" })); // v1 (target='')
    r.save(makeMsg({ from: "A", to: "B", nonce: "n2", targetDeviceId: "d1" }));
    // v1-метод видит только v1-строку; device-метод — только копию устройства.
    assert.equal(r.getAfter("c1", "B", 0).length, 1);
    assert.equal(r.getAfterForDevice("c1", "d1", 0).length, 1);
    assert.equal(r.getAfterForDevice("c1", "d2", 0).length, 0);
});
