import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { DeviceSQLiteRepository } from "./DeviceSQLiteRepository.js";

// Реестр устройств: регистрация и список по аккаунту, идемпотентность add,
// точечное удаление.
function setup() {
    return new DeviceSQLiteRepository(new Database(":memory:"));
}

test("add registers devices per account, getDevices lists them", () => {
    const repo = setup();
    repo.add("A", "d1");
    repo.add("A", "d2");
    repo.add("B", "d3");
    assert.deepEqual(repo.getDevices("A").sort(), ["d1", "d2"]);
    assert.deepEqual(repo.getDevices("B"), ["d3"]);
    assert.deepEqual(repo.getDevices("C"), []);
});

test("add is idempotent per (account, device)", () => {
    const repo = setup();
    repo.add("A", "d1");
    repo.add("A", "d1");
    assert.deepEqual(repo.getDevices("A"), ["d1"]);
});

test("remove drops one device, keeps the rest", () => {
    const repo = setup();
    repo.add("A", "d1");
    repo.add("A", "d2");
    repo.remove("A", "d1");
    assert.deepEqual(repo.getDevices("A"), ["d2"]);
});

test("add caps devices per account at the limit (anti-amplification)", () => {
    const repo = setup();
    for (let i = 0; i < 25; i++) {
        repo.add("A", "d" + i);
    }
    assert.equal(repo.getDevices("A").length, 20); // MAX_DEVICES_PER_ACCOUNT
    repo.add("B", "x");
    assert.equal(repo.getDevices("B").length, 1); // другой аккаунт не задет
});

test("setPrekey stores one prekey per device; getPrekeys lists all", () => {
    const repo = setup();
    repo.setPrekey("A", "d1", 1, "pub1", "sig1");
    repo.setPrekey("A", "d2", 3, "pub2", "sig2");
    const prekeys = repo.getPrekeys("A");
    assert.equal(prekeys.length, 2);
    assert.deepEqual(
        prekeys.find((p) => p.deviceId === "d1"),
        {
            deviceId: "d1",
            epochId: 1,
            epochPub: "pub1",
            signature: "sig1",
        }
    );
});

test("setPrekey overwrites the device's previous prekey on a new epoch", () => {
    const repo = setup();
    repo.setPrekey("A", "d1", 1, "pub1", "sig1");
    repo.setPrekey("A", "d1", 2, "pub2", "sig2");
    const prekeys = repo.getPrekeys("A");
    assert.equal(prekeys.length, 1);
    assert.equal(prekeys[0].epochId, 2);
    assert.equal(prekeys[0].epochPub, "pub2");
});
