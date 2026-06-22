import Database from "better-sqlite3";

import type { UserEventQueue } from "./UserEventQueue.js";
import type { ServerMessage } from "shared";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_USER = 50;

export class UserEventSQLiteQueue implements UserEventQueue {
    constructor(private db: Database.Database) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_event_queue (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    TEXT    NOT NULL,
                event      TEXT    NOT NULL,
                expires_at INTEGER NOT NULL
            )
        `);
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_ueq_user_id ON user_event_queue (user_id)`
        );
    }

    push(userId: string, event: ServerMessage): void {
        const count = (
            this.db
                .prepare(
                    `SELECT COUNT(*) AS c FROM user_event_queue WHERE user_id = ?`
                )
                .get(userId) as { c: number }
        ).c;

        if (count >= MAX_PER_USER) {
            this.db
                .prepare(
                    `DELETE FROM user_event_queue WHERE id IN (
                        SELECT id FROM user_event_queue WHERE user_id = ? ORDER BY id ASC LIMIT ?
                    )`
                )
                .run(userId, count - MAX_PER_USER + 1);
        }

        this.db
            .prepare(
                `INSERT INTO user_event_queue (user_id, event, expires_at) VALUES (?, ?, ?)`
            )
            .run(userId, JSON.stringify(event), Date.now() + TTL_MS);
    }

    flush(userId: string): ServerMessage[] {
        const rows = this.db
            .prepare(
                `SELECT event FROM user_event_queue WHERE user_id = ? AND expires_at > ?`
            )
            .all(userId, Date.now()) as { event: string }[];

        this.db
            .prepare(`DELETE FROM user_event_queue WHERE user_id = ?`)
            .run(userId);

        return rows.map((r) => JSON.parse(r.event) as ServerMessage);
    }
}
