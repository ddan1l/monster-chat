import Database from "better-sqlite3";

import type { ChatMemberRepository } from "./ChatMemberRepository.js";

export class ChatMemberSQLiteRepository implements ChatMemberRepository {
    constructor(private db: Database.Database) {
        // unread — счётчик непрочитанных на (чат, аккаунт). В транзитной v2-модели
        // сообщения удаляются при доставке, поэтому непрочитанные нельзя выводить
        // из хранимых строк — держим явный счётчик (bump при доставке, 0 при read).
        db.exec(`
            CREATE TABLE IF NOT EXISTS chat_members (
                chat_id      TEXT    NOT NULL,
                sign_pub_key TEXT    NOT NULL,
                unread       INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (chat_id, sign_pub_key)
            )
        `);
        // Миграция со seq-based unread: добавляем колонку, если её нет.
        const cols = db.prepare(`PRAGMA table_info(chat_members)`).all() as {
            name: string;
        }[];
        if (!cols.some((c) => c.name === "unread")) {
            db.exec(
                `ALTER TABLE chat_members ADD COLUMN unread INTEGER NOT NULL DEFAULT 0`
            );
        }
        db.exec(
            `CREATE INDEX IF NOT EXISTS idx_chat_members_key ON chat_members (sign_pub_key)`
        );
    }

    add(chatId: string, signPubKey: string): void {
        this.db
            .prepare(
                `INSERT OR IGNORE INTO chat_members (chat_id, sign_pub_key) VALUES (?, ?)`
            )
            .run(chatId, signPubKey);
    }

    getChatIds(signPubKey: string): string[] {
        const rows = this.db
            .prepare(`SELECT chat_id FROM chat_members WHERE sign_pub_key = ?`)
            .all(signPubKey) as { chat_id: string }[];
        return rows.map((r) => r.chat_id);
    }

    getMembers(chatId: string): string[] {
        const rows = this.db
            .prepare(`SELECT sign_pub_key FROM chat_members WHERE chat_id = ?`)
            .all(chatId) as { sign_pub_key: string }[];
        return rows.map((r) => r.sign_pub_key);
    }

    isMember(chatId: string, signPubKey: string): boolean {
        const row = this.db
            .prepare(
                `SELECT 1 FROM chat_members WHERE chat_id = ? AND sign_pub_key = ?`
            )
            .get(chatId, signPubKey);
        return !!row;
    }

    getUnread(chatId: string, signPubKey: string): number {
        const row = this.db
            .prepare(
                `SELECT unread FROM chat_members WHERE chat_id = ? AND sign_pub_key = ?`
            )
            .get(chatId, signPubKey) as { unread: number } | undefined;
        return row?.unread ?? 0;
    }

    // Инкремент непрочитанных; возвращает новое значение (для notify).
    bumpUnread(chatId: string, signPubKey: string): number {
        const row = this.db
            .prepare(
                `UPDATE chat_members SET unread = unread + 1
                 WHERE chat_id = ? AND sign_pub_key = ?
                 RETURNING unread`
            )
            .get(chatId, signPubKey) as { unread: number } | undefined;
        return row?.unread ?? 0;
    }

    clearUnread(chatId: string, signPubKey: string): void {
        this.db
            .prepare(
                `UPDATE chat_members SET unread = 0
                 WHERE chat_id = ? AND sign_pub_key = ?`
            )
            .run(chatId, signPubKey);
    }

    remove(chatId: string, signPubKey: string): void {
        this.db
            .prepare(
                `DELETE FROM chat_members WHERE chat_id = ? AND sign_pub_key = ?`
            )
            .run(chatId, signPubKey);
    }

    removeByChat(chatId: string): void {
        this.db
            .prepare(`DELETE FROM chat_members WHERE chat_id = ?`)
            .run(chatId);
    }
}
