import assert from "node:assert/strict";
import { test } from "node:test";

import { fakePeer } from "../testHelpers.js";

import { ConnectionInMemoryRepository } from "./ConnectionInMemoryRepository.js";

// Per-device соединения: устройства одного аккаунта сосуществуют (второе не
// затирает первое), и аккаунт исчезает из карты, когда ушло последнее.

test("two devices of one account coexist without overwriting", () => {
    const repo = new ConnectionInMemoryRepository();
    const p1 = fakePeer({ signPubKey: "A", deviceId: "d1" });
    const p2 = fakePeer({ signPubKey: "A", deviceId: "d2" });
    repo.set("A", "d1", p1);
    repo.set("A", "d2", p2);

    assert.equal(repo.getDevices("A").length, 2);
    assert.equal(repo.getDevice("A", "d1"), p1);
    assert.equal(repo.getDevice("A", "d2"), p2);
});

test("delete removes one device; account cleared when last leaves", () => {
    const repo = new ConnectionInMemoryRepository();
    repo.set("A", "d1", fakePeer({}));
    repo.set("A", "d2", fakePeer({}));

    repo.delete("A", "d1");
    assert.equal(repo.getDevices("A").length, 1);

    repo.delete("A", "d2");
    assert.equal(repo.getDevices("A").length, 0);
    assert.equal(repo.get("A"), undefined);
});
