import Database from "better-sqlite3";

import type { ChatMessageQueue } from "./ChatMessageQueue.js";
import type { ChatMessage } from "shared";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_KEY = 100;

export class ChatMessageSQLiteQueue implements ChatMessageQueue {
    constructor(private db: Database.Database) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_message_queue (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                key        TEXT    NOT NULL,
                message    TEXT    NOT NULL,
                expires_at INTEGER NOT NULL
            )
        `);
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_cmq_key ON chat_message_queue (key)`
        );
    }

    push(key: string, message: ChatMessage): void {
        const count = (
            this.db
                .prepare(
                    `SELECT COUNT(*) AS c FROM chat_message_queue WHERE key = ?`
                )
                .get(key) as { c: number }
        ).c;

        if (count >= MAX_PER_KEY) {
            this.db
                .prepare(
                    `DELETE FROM chat_message_queue WHERE id IN (
                        SELECT id FROM chat_message_queue WHERE key = ? ORDER BY id ASC LIMIT ?
                    )`
                )
                .run(key, count - MAX_PER_KEY + 1);
        }

        this.db
            .prepare(
                `INSERT INTO chat_message_queue (key, message, expires_at) VALUES (?, ?, ?)`
            )
            .run(key, JSON.stringify(message), Date.now() + TTL_MS);
    }

    flush(key: string): ChatMessage[] {
        const rows = this.db
            .prepare(
                `SELECT message FROM chat_message_queue WHERE key = ? AND expires_at > ?`
            )
            .all(key, Date.now()) as { message: string }[];

        this.db
            .prepare(`DELETE FROM chat_message_queue WHERE key = ?`)
            .run(key);

        return rows.map((r) => JSON.parse(r.message) as ChatMessage);
    }
}
