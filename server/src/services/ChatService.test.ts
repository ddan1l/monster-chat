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

test("deliver persists, ACKs the sending device, fans out, and notifies", () => {
    const { svc, messages, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const peerA = fakePeer({ signPubKey: "A", deviceId: "dA", chatId: "c1" });
    const peerB = fakePeer({ signPubKey: "B", deviceId: "dB", chatId: "c1" });
    conns.set("A", "dA", peerA);
    conns.set("B", "dB", peerB);

    const msg = makeMsg({ from: "A", to: "B" });
    svc.deliver("c1", msg, "dA");

    assert.equal(messages.getMaxSeq("c1"), 1);
    assert.equal(msg.seq, 1);
    // Отправителю — только ACK (без эха на само себя).
    assert.deepEqual(notif.typesTo(peerA), ["ack"]);
    assert.ok(notif.typesTo(peerB).includes("message")); // получателю — доставка
    assert.deepEqual(notif.notified, [{ key: "B", chatId: "c1", unread: 1 }]);
});

test("deliver fans out live to all recipient devices", () => {
    const { svc, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const b1 = fakePeer({ signPubKey: "B", deviceId: "d1", chatId: "c1" });
    const b2 = fakePeer({ signPubKey: "B", deviceId: "d2", chatId: "c1" });
    conns.set("B", "d1", b1);
    conns.set("B", "d2", b2);

    svc.deliver("c1", makeMsg({ from: "A", to: "B" }), "dA");

    assert.ok(notif.typesTo(b1).includes("message"));
    assert.ok(notif.typesTo(b2).includes("message"));
});

test("deliver echoes to the sender's OTHER devices, not the sending one", () => {
    const { svc, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const a1 = fakePeer({ signPubKey: "A", deviceId: "dA1", chatId: "c1" });
    const a2 = fakePeer({ signPubKey: "A", deviceId: "dA2", chatId: "c1" });
    conns.set("A", "dA1", a1);
    conns.set("A", "dA2", a2);

    svc.deliver("c1", makeMsg({ from: "A", to: "B" }), "dA1");

    // Отправившее устройство — только ACK; другое устройство аккаунта — эхо.
    assert.deepEqual(notif.typesTo(a1), ["ack"]);
    assert.ok(notif.typesTo(a2).includes("message"));
});

test("deliver of a silent message does not notify", () => {
    const { svc, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    conns.set("A", "A", fakePeer({ signPubKey: "A", chatId: "c1" }));

    svc.deliver("c1", makeMsg({ from: "A", to: "B", silent: true }));
    assert.equal(notif.notified.length, 0);
});

test("deliver to a non-member (deleted-for-me) does not notify", () => {
    const { svc, members, notif } = setup();
    members.add("c1", "A"); // B ушёл — не участник
    svc.deliver("c1", makeMsg({ from: "A", to: "B" }));
    assert.equal(notif.notified.length, 0);
});

test("deliver by a non-member is dropped: nothing persists or is sent", () => {
    const { svc, messages, conns, notif } = setup();
    // Никого не добавляем в c1 — отправитель A не участник чата.
    const peerA = fakePeer({ signPubKey: "A", chatId: "c1" });
    const peerB = fakePeer({ signPubKey: "B", chatId: "c1" });
    conns.set("A", "A", peerA);
    conns.set("B", "B", peerB);

    svc.deliver("c1", makeMsg({ from: "A", to: "B" }));

    assert.equal(messages.getMaxSeq("c1"), 0); // не сохранено
    assert.deepEqual(notif.typesTo(peerA), []); // нет ACK отправителю
    assert.deepEqual(notif.typesTo(peerB), []); // нет live-доставки
    assert.equal(notif.notified.length, 0);
});

test("markRead moves the read cursor so unread drops", () => {
    const { svc, members, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");

    svc.deliver("c1", makeMsg({ from: "A", to: "B" })); // unread 1
    svc.markRead("c1", "B"); // курсор → seq1
    svc.deliver("c1", makeMsg({ from: "A", to: "B" })); // unread снова 1, не 2

    assert.deepEqual(
        notif.notified.map((n) => n.unread),
        [1, 1]
    );
});

test("join sets peer.chatId, delivers missed + chat_opened in order", () => {
    const { svc, messages, notif } = setup();
    messages.save(makeMsg({ from: "A", to: "B" }));
    messages.save(makeMsg({ from: "B", to: "A" }));
    const peerB = fakePeer({ signPubKey: "B", deviceId: "dB" });

    svc.join("c1", "B", "dB", peerB, 0);

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
    svc.join("c1", "B", "dB", peerB, 1);

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
