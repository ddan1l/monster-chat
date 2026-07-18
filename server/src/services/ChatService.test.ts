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

test("deliver persists, ACKs the sender, live-delivers, and notifies", () => {
    const { svc, messages, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const peerA = fakePeer({ signPubKey: "A", chatId: "c1" });
    const peerB = fakePeer({ signPubKey: "B", chatId: "c1" });
    conns.set("A", peerA);
    conns.set("B", peerB);

    const msg = makeMsg({ from: "A", to: "B" });
    svc.deliver("c1", msg);

    assert.equal(messages.getMaxSeq("c1"), 1);
    assert.equal(msg.seq, 1);
    assert.ok(notif.typesTo(peerA).includes("ack")); // ACK отправителю
    assert.ok(notif.typesTo(peerB).includes("message")); // live-доставка
    assert.deepEqual(notif.notified, [{ key: "B", chatId: "c1", unread: 1 }]);
});

test("deliver of a silent message does not notify", () => {
    const { svc, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    conns.set("A", fakePeer({ signPubKey: "A", chatId: "c1" }));

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
    conns.set("A", peerA);
    conns.set("B", peerB);

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
    const peerB = fakePeer({ signPubKey: "B" });

    svc.join("c1", "B", peerB, 0);

    assert.equal(peerB.chatId, "c1");
    assert.deepEqual(notif.typesTo(peerB), [
        "message",
        "message",
        "chat_opened",
    ]);
});

test("deleteChatForMe removes membership and notifies the remaining peer", () => {
    const { svc, members, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    const peerB = fakePeer({ signPubKey: "B" });
    conns.set("B", peerB);

    svc.deleteChatForMe("c1", "A");

    assert.equal(members.isMember("c1", "A"), false);
    assert.equal(members.isMember("c1", "B"), true);
    assert.ok(notif.typesTo(peerB).includes("chat_deleted"));
});

test("deleteChatForMe queues chat_deleted for an offline peer", () => {
    const { svc, members, queue } = setup();
    members.add("c1", "A");
    members.add("c1", "B"); // B офлайн (нет в conns)

    svc.deleteChatForMe("c1", "A");
    assert.equal(queue.pushed[0].key, "B");
    assert.equal(queue.pushed[0].event.type, "chat_deleted");
});

test("deleteChatForMe by the last member wipes the messages", () => {
    const { svc, members, messages } = setup();
    members.add("c1", "A");
    messages.save(makeMsg({ from: "A", to: "B" }));

    svc.deleteChatForMe("c1", "A");
    assert.equal(messages.getMaxSeq("c1"), 0);
});

test("deleteChatForAll clears members + messages and notifies others", () => {
    const { svc, members, messages, conns, notif } = setup();
    members.add("c1", "A");
    members.add("c1", "B");
    messages.save(makeMsg({ from: "A", to: "B" }));
    const peerB = fakePeer({ signPubKey: "B" });
    conns.set("B", peerB);

    svc.deleteChatForAll("c1", "A");

    assert.deepEqual(members.getMembers("c1"), []);
    assert.equal(messages.getMaxSeq("c1"), 0);
    assert.ok(notif.typesTo(peerB).includes("chat_destroyed"));
});

test("deleteChatForAll by a non-member is a no-op", () => {
    const { svc, members } = setup();
    members.add("c1", "A");
    members.add("c1", "B");

    svc.deleteChatForAll("c1", "X"); // X не участник
    assert.deepEqual(members.getMembers("c1").sort(), ["A", "B"]);
});
