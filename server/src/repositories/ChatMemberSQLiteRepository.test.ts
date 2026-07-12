import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { ChatMemberSQLiteRepository } from "./ChatMemberSQLiteRepository.js";

function repo() {
    return new ChatMemberSQLiteRepository(new Database(":memory:"));
}

test("add / getMembers / getChatIds / isMember", () => {
    const r = repo();
    r.add("c1", "A");
    r.add("c1", "B");
    r.add("c2", "A");

    assert.deepEqual(r.getMembers("c1").sort(), ["A", "B"]);
    assert.deepEqual(r.getChatIds("A").sort(), ["c1", "c2"]);
    assert.equal(r.isMember("c1", "B"), true);
    assert.equal(r.isMember("c1", "X"), false);
});

test("read_seq defaults to 0 and is settable", () => {
    const r = repo();
    r.add("c1", "A");
    assert.equal(r.getReadSeq("c1", "A"), 0);
    r.setReadSeq("c1", "A", 7);
    assert.equal(r.getReadSeq("c1", "A"), 7);
});

test("add is idempotent and preserves read_seq", () => {
    const r = repo();
    r.add("c1", "A");
    r.setReadSeq("c1", "A", 5);
    r.add("c1", "A"); // повтор не должен сбросить курсор
    assert.equal(r.getReadSeq("c1", "A"), 5);
    assert.equal(r.getMembers("c1").length, 1);
});

test("remove drops one membership, removeByChat drops all", () => {
    const r = repo();
    r.add("c1", "A");
    r.add("c1", "B");
    r.remove("c1", "A");
    assert.equal(r.isMember("c1", "A"), false);
    assert.deepEqual(r.getMembers("c1"), ["B"]);
    r.removeByChat("c1");
    assert.deepEqual(r.getMembers("c1"), []);
});
