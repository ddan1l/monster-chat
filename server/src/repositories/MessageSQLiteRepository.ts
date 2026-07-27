import Database from "better-sqlite3";

import type { MessageRepository } from "./MessageRepository.js";
import type { ChatMessage } from "shared";

// Хранение сообщений. v1: одна строка на сообщение (target_device_id = '').
// v2 (FS): одна строка на per-device копию — уникальность по (nonce,
// target_device_id), синк каждого устройства по его копиям.
export class MessageSQLiteRepository implements MessageRepository {
    constructor(private db: Database.Database) {
        // Миграция на device-scoped: если старая схема без target_device_id —
        // пересоздаём (серверный архив теряется; история живёт в локальных
        // сторах устройств — это принятый компромисс FS).
        const cols = db.prepare(`PRAGMA table_info(chat_messages)`).all() as {
            name: string;
        }[];
        if (
            cols.length > 0 &&
            !cols.some((c) => c.name === "target_device_id")
        ) {
            db.exec(`DROP TABLE chat_messages`);
        }
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                seq              INTEGER PRIMARY KEY AUTOINCREMENT,
                nonce            TEXT    NOT NULL,
                target_device_id TEXT    NOT NULL DEFAULT '',
                chat_id          TEXT    NOT NULL,
                sender           TEXT    NOT NULL,
                recipient        TEXT    NOT NULL,
                message          TEXT    NOT NULL,
                timestamp        INTEGER NOT NULL,
                silent           INTEGER NOT NULL DEFAULT 0,
                UNIQUE (nonce, target_device_id)
            )
        `);
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_chat_messages_device
             ON chat_messages (chat_id, target_device_id, seq)`
        );
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_chat_messages_lookup
             ON chat_messages (chat_id, sender, recipient, seq)`
        );
    }

    save(message: ChatMessage): void {
        const targetDeviceId = message.targetDeviceId ?? "";
        const info = this.db
            .prepare(
                `INSERT OR IGNORE INTO chat_messages
                     (nonce, target_device_id, chat_id, sender, recipient, message, timestamp, silent)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                message.nonce,
                targetDeviceId,
                message.chatId,
                message.from,
                message.to,
                JSON.stringify(message),
                message.timestamp,
                message.silent ? 1 : 0
            );

        if (info.changes > 0) {
            message.seq = Number(info.lastInsertRowid);
        } else {
            // Дубликат по (nonce, target_device_id) — берём присвоенный seq.
            const row = this.db
                .prepare(
                    `SELECT seq FROM chat_messages
                     WHERE nonce = ? AND target_device_id = ?`
                )
                .get(message.nonce, targetDeviceId) as
                | { seq: number }
                | undefined;
            if (row) message.seq = row.seq;
        }
    }

    // --- v1 (account-scoped, только строки target_device_id = '') ---

    getAfter(
        chatId: string,
        signPubKey: string,
        afterSeq: number
    ): ChatMessage[] {
        const rows = this.db
            .prepare(
                `SELECT seq, message FROM chat_messages
                 WHERE chat_id = ? AND target_device_id = ''
                   AND (sender = ? OR recipient = ?) AND seq > ?
                 ORDER BY seq ASC`
            )
            .all(chatId, signPubKey, signPubKey, afterSeq) as {
            seq: number;
            message: string;
        }[];
        return rows.map((r) => ({
            ...(JSON.parse(r.message) as ChatMessage),
            seq: r.seq,
        }));
    }

    getMaxSeq(chatId: string): number {
        const row = this.db
            .prepare(
                `SELECT MAX(seq) AS max FROM chat_messages
                 WHERE chat_id = ? AND target_device_id = ''`
            )
            .get(chatId) as { max: number | null };
        return row.max ?? 0;
    }

    countUnread(chatId: string, signPubKey: string, afterSeq: number): number {
        const row = this.db
            .prepare(
                `SELECT COUNT(*) AS c FROM chat_messages
                 WHERE chat_id = ? AND target_device_id = ''
                   AND recipient = ? AND seq > ? AND silent = 0`
            )
            .get(chatId, signPubKey, afterSeq) as { c: number };
        return row.c;
    }

    // --- v2 (device-scoped: копии, адресованные конкретному устройству) ---

    getAfterForDevice(
        chatId: string,
        deviceId: string,
        afterSeq: number
    ): ChatMessage[] {
        const rows = this.db
            .prepare(
                `SELECT seq, message FROM chat_messages
                 WHERE chat_id = ? AND target_device_id = ? AND seq > ?
                 ORDER BY seq ASC`
            )
            .all(chatId, deviceId, afterSeq) as {
            seq: number;
            message: string;
        }[];
        return rows.map((r) => ({
            ...(JSON.parse(r.message) as ChatMessage),
            seq: r.seq,
        }));
    }

    removeByChat(chatId: string): void {
        this.db
            .prepare(`DELETE FROM chat_messages WHERE chat_id = ?`)
            .run(chatId);
    }

    deleteDeviceDeliveredUpTo(
        chatId: string,
        deviceId: string,
        seq: number
    ): void {
        this.db
            .prepare(
                `DELETE FROM chat_messages
                 WHERE chat_id = ? AND target_device_id = ? AND seq <= ?`
            )
            .run(chatId, deviceId, seq);
    }

    deleteExpired(before: number): void {
        this.db
            .prepare(`DELETE FROM chat_messages WHERE timestamp < ?`)
            .run(before);
    }
}
