import assert from "node:assert/strict";
import { test } from "node:test";

import Database from "better-sqlite3";

import { ChatMemberSQLiteRepository } from "../repositories/ChatMemberSQLiteRepository.js";
import { ConnectionInMemoryRepository } from "../repositories/ConnectionInMemoryRepository.js";
import { MessageSQLiteRepository } from "../repositories/MessageSQLiteRepository.js";
import { PendingChatInMemoryRepository } from "../repositories/PendingChatInMemoryRepository.js";
import {
    fakePeer,
    makeMsg,
    notifRecorder,
    queueRecorder,
} from "../testHelpers.js";

import { ChatService } from "./ChatService.js";

function setup() {
    const db = new Database(":memory:");
    const messages = new MessageSQLiteRepository(db);
    const members = new ChatMemberSQLiteRepository(db);
    const conns = new ConnectionInMemoryRepository();
    const pending = new PendingChatInMemoryRepository();
    const notif = notifRecorder();
    const queue = queueRecorder();
    const svc = new ChatService(
        conns,
        messages,
        members,
        pending,
        notif.service,
        queue
    );
    return { svc, messages, members, conns, notif, queue };
}

test("join delivers this device's missed copies + chat_opened in order", () => {
    const { svc, messages, notif } = setup();
    messages.save(
        makeMsg({ from: "A", to: "B", nonce: "m1", targetDeviceId: "dB" })
    );
    messages.save(
        makeMsg({ from: "A", to: "B", nonce: "m2", targetDeviceId: "dB" })
    );
    const peerB = fakePeer({ signPubKey: "B", deviceId: "dB" });

    svc.join("c1", "dB", peerB, 0);

    assert.equal(peerB.chatId, "c1");
    assert.deepEqual(notif.typesTo(peerB), [
        "message",
        "message",
        "chat_opened",
    ]);
});

test("join deletes the device's confirmed copies (transit model)", () => {
    const { svc, messages } = setup();
    messages.save(
        makeMsg({ from: "A", to: "B", nonce: "m1", targetDeviceId: "dB" })
    ); // seq 1
    messages.save(
        makeMsg({ from: "A", to: "B", nonce: "m2", targetDeviceId: "dB" })
    ); // seq 2
    const peerB = fakePeer({ signPubKey: "B", deviceId: "dB" });

    // Устройство подтверждает курсором, что имеет seq 1.
    svc.join("c1", "dB", peerB, 1);

    // seq 1 удалён с сервера (устройство его имеет), seq 2 остался.
    assert.deepEqual(
        messages.getAfterForDevice("c1", "dB", 0).map((m) => m.seq),
        [2]
    );
});

test("deliverBundle explodes copies, saves per-device, delivers, ACKs once", () => {
    const { svc, messages, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const peerA = fakePeer({ signPubKey: "A", deviceId: "dA" });
    const peerB = fakePeer({ signPubKey: "B", deviceId: "dB", chatId: "c1" });
    conns.set("A", "dA", peerA);
    conns.set("B", "dB", peerB);

    svc.deliverBundle(
        {
            chatId: "c1",
            from: "A",
            to: "B",
            nonce: "n1",
            timestamp: Date.now(),
            copies: [
                {
                    targetDeviceId: "dB",
                    epochId: 1,
                    ephemeralPub: "eph",
                    iv: "iv",
                    payload: "ct",
                    signature: "sig",
                },
            ],
        },
        "dA"
    );

    // Копия сохранена device-scoped и доехала до dB; отправитель получил ACK.
    assert.equal(messages.getAfterForDevice("c1", "dB", 0).length, 1);
    assert.ok(notif.typesTo(peerB).includes("message"));
    assert.deepEqual(notif.typesTo(peerA), ["ack"]);
});

test("deliverBundle by a non-member is dropped", () => {
    const { svc, messages, members } = setup();
    members.add("c1", "B"); // A не участник
    svc.deliverBundle(
        {
            chatId: "c1",
            from: "A",
            to: "B",
            nonce: "n1",
            timestamp: Date.now(),
            copies: [
                {
                    targetDeviceId: "dB",
                    epochId: 1,
                    ephemeralPub: "e",
                    iv: "i",
                    payload: "p",
                    signature: "s",
                },
            ],
        },
        "dA"
    );
    assert.equal(messages.getAfterForDevice("c1", "dB", 0).length, 0);
});

test("deleteChatForMe removes membership and delivers chat_deleted to the account", () => {
    const { svc, members, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");

    svc.deleteChatForMe("c1", "A");

    assert.equal(members.isMember("c1", "A"), false);
    assert.equal(members.isMember("c1", "B"), true);
    // Доставка на аккаунт B (deliverToAccount сам решит live/очередь по устройствам).
    assert.ok(notif.deliveredTo("B").includes("chat_deleted"));
});

test("deleteChatForMe by the last member wipes the messages", () => {
    const { svc, members, messages } = setup();
    members.add("c1", "A");
    messages.save(makeMsg({ from: "A", to: "B" }));

    svc.deleteChatForMe("c1", "A");
    assert.equal(messages.getMaxSeq("c1"), 0);
});

test("deleteChatForAll clears members + messages and notifies others", () => {
    const { svc, members, messages, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    messages.save(makeMsg({ from: "A", to: "B" }));

    svc.deleteChatForAll("c1", "A");

    assert.deepEqual(members.getMembers("c1"), []);
    assert.equal(messages.getMaxSeq("c1"), 0);
    assert.ok(notif.deliveredTo("B").includes("chat_destroyed"));
});

test("deleteChatForAll by a non-member is a no-op", () => {
    const { svc, members } = setup();
    members.add("c1", "A");
    members.add("c1", "B");

    svc.deleteChatForAll("c1", "X"); // X не участник
    assert.deepEqual(members.getMembers("c1").sort(), ["A", "B"]);
});
