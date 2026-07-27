import Database from "better-sqlite3";

import type { UserEventQueue } from "./UserEventQueue.js";
import type { ServerMessage } from "shared";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PER_DEVICE = 50;

export class UserEventSQLiteQueue implements UserEventQueue {
    constructor(private db: Database.Database) {
        // Миграция на per-device: если старая схема без device_id — пересоздаём
        // (события эфемерны, потерять не жалко).
        const cols = db
            .prepare(`PRAGMA table_info(user_event_queue)`)
            .all() as { name: string }[];
        if (cols.length > 0 && !cols.some((c) => c.name === "device_id")) {
            db.exec(`DROP TABLE user_event_queue`);
        }
        db.exec(`
            CREATE TABLE IF NOT EXISTS user_event_queue (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    TEXT    NOT NULL,
                device_id  TEXT    NOT NULL DEFAULT '',
                event      TEXT    NOT NULL,
                expires_at INTEGER NOT NULL
            )
        `);
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_ueq_target
             ON user_event_queue (user_id, device_id)`
        );
    }

    push(userId: string, deviceId: string, event: ServerMessage): void {
        const count = (
            this.db
                .prepare(
                    `SELECT COUNT(*) AS c FROM user_event_queue
                     WHERE user_id = ? AND device_id = ?`
                )
                .get(userId, deviceId) as { c: number }
        ).c;

        if (count >= MAX_PER_DEVICE) {
            this.db
                .prepare(
                    `DELETE FROM user_event_queue WHERE id IN (
                        SELECT id FROM user_event_queue
                        WHERE user_id = ? AND device_id = ?
                        ORDER BY id ASC LIMIT ?
                    )`
                )
                .run(userId, deviceId, count - MAX_PER_DEVICE + 1);
        }

        this.db
            .prepare(
                `INSERT INTO user_event_queue (user_id, device_id, event, expires_at)
                 VALUES (?, ?, ?, ?)`
            )
            .run(userId, deviceId, JSON.stringify(event), Date.now() + TTL_MS);
    }

    // Забирает события устройства + аккаунт-фолбэк (device_id = '').
    flush(userId: string, deviceId: string): ServerMessage[] {
        const rows = this.db
            .prepare(
                `SELECT event FROM user_event_queue
                 WHERE user_id = ? AND (device_id = ? OR device_id = '')
                   AND expires_at > ?
                 ORDER BY id ASC`
            )
            .all(userId, deviceId, Date.now()) as { event: string }[];

        this.db
            .prepare(
                `DELETE FROM user_event_queue
                 WHERE user_id = ? AND (device_id = ? OR device_id = '')`
            )
            .run(userId, deviceId);

        return rows.map((r) => JSON.parse(r.event) as ServerMessage);
    }
}
