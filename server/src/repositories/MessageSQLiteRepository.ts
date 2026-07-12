import Database from "better-sqlite3";

import type { MessageRepository } from "./MessageRepository.js";
import type { ChatMessage } from "shared";

export class MessageSQLiteRepository implements MessageRepository {
    constructor(private db: Database.Database) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                seq        INTEGER PRIMARY KEY AUTOINCREMENT,
                nonce      TEXT    NOT NULL UNIQUE,
                chat_id    TEXT    NOT NULL,
                sender     TEXT    NOT NULL,
                recipient  TEXT    NOT NULL,
                message    TEXT    NOT NULL,
                timestamp  INTEGER NOT NULL,
                silent     INTEGER NOT NULL DEFAULT 0
            )
        `);
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_chat_messages_lookup
             ON chat_messages (chat_id, sender, recipient, seq)`
        );
    }

    save(message: ChatMessage): void {
        const info = this.db
            .prepare(
                `INSERT OR IGNORE INTO chat_messages (nonce, chat_id, sender, recipient, message, timestamp, silent)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                message.nonce,
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
            // Дубликат по nonce — берём уже присвоенный seq.
            const row = this.db
                .prepare(`SELECT seq FROM chat_messages WHERE nonce = ?`)
                .get(message.nonce) as { seq: number } | undefined;
            if (row) message.seq = row.seq;
        }
    }

    getAfter(
        chatId: string,
        signPubKey: string,
        afterSeq: number
    ): ChatMessage[] {
        const rows = this.db
            .prepare(
                `SELECT seq, message FROM chat_messages
                 WHERE chat_id = ? AND (sender = ? OR recipient = ?) AND seq > ?
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

    getPage(
        chatId: string,
        signPubKey: string,
        beforeSeq: number,
        limit: number
    ): ChatMessage[] {
        const rows = this.db
            .prepare(
                `SELECT seq, message FROM chat_messages
                 WHERE chat_id = ? AND (sender = ? OR recipient = ?) AND seq < ?
                 ORDER BY seq DESC
                 LIMIT ?`
            )
            .all(chatId, signPubKey, signPubKey, beforeSeq, limit) as {
            seq: number;
            message: string;
        }[];
        return rows
            .map((r) => ({
                ...(JSON.parse(r.message) as ChatMessage),
                seq: r.seq,
            }))
            .reverse();
    }

    getMaxSeq(chatId: string): number {
        const row = this.db
            .prepare(
                `SELECT MAX(seq) AS max FROM chat_messages WHERE chat_id = ?`
            )
            .get(chatId) as { max: number | null };
        return row.max ?? 0;
    }

    countUnread(chatId: string, signPubKey: string, afterSeq: number): number {
        const row = this.db
            .prepare(
                `SELECT COUNT(*) AS c FROM chat_messages
                 WHERE chat_id = ? AND recipient = ? AND seq > ? AND silent = 0`
            )
            .get(chatId, signPubKey, afterSeq) as { c: number };
        return row.c;
    }

    removeByChat(chatId: string): void {
        this.db
            .prepare(`DELETE FROM chat_messages WHERE chat_id = ?`)
            .run(chatId);
    }
}
