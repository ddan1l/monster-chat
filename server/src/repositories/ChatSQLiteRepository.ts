import Database from "better-sqlite3";
import type { ChatRepository } from "./ChatRepository.js";

export class ChatSQLiteRepository implements ChatRepository {
    constructor(private db: Database.Database) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_authorizations (
                chat_id     TEXT NOT NULL,
                sign_pub_key TEXT NOT NULL,
                PRIMARY KEY (chat_id, sign_pub_key)
            )
        `);
    }

    authorize(chatId: string, signPubKey: string): void {
        this.db
            .prepare(
                `INSERT OR IGNORE INTO chat_authorizations (chat_id, sign_pub_key) VALUES (?, ?)`
            )
            .run(chatId, signPubKey);
    }

    isAuthorized(chatId: string, signPubKey: string): boolean {
        const row = this.db
            .prepare(
                `SELECT 1 FROM chat_authorizations WHERE chat_id = ? AND sign_pub_key = ?`
            )
            .get(chatId, signPubKey);
        return row !== undefined;
    }

    getAuthorizedKeys(chatId: string): string[] {
        const rows = this.db
            .prepare(
                `SELECT sign_pub_key FROM chat_authorizations WHERE chat_id = ?`
            )
            .all(chatId) as { sign_pub_key: string }[];
        return rows.map((r) => r.sign_pub_key);
    }
}
