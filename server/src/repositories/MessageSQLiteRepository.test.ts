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

test("getPage returns ascending page below the cursor", () => {
    const r = repo();
    for (let i = 0; i < 5; i++) r.save(makeMsg({ from: "A", to: "B" }));
    const page = r.getPage("c1", "A", 4, 2); // seq < 4, limit 2 → [2,3]
    assert.deepEqual(
        page.map((m) => m.seq),
        [2, 3]
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
