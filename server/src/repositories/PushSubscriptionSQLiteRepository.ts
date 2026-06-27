import type { PushSubscriptionRepository } from "./PushSubscriptionRepository.js";
import type Database from "better-sqlite3";

export class PushSubscriptionSQLiteRepository implements PushSubscriptionRepository {
    constructor(private db: Database.Database) {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                sign_pub_key TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                subscription TEXT NOT NULL,
                PRIMARY KEY (sign_pub_key, endpoint)
            )
        `);
    }

    save(signPubKey: string, subscription: PushSubscriptionJSON): void {
        this.db
            .prepare(
                `INSERT OR REPLACE INTO push_subscriptions (sign_pub_key, endpoint, subscription)
                 VALUES (?, ?, ?)`
            )
            .run(
                signPubKey,
                subscription.endpoint!,
                JSON.stringify(subscription)
            );
    }

    findAll(signPubKey: string): PushSubscriptionJSON[] {
        const rows = this.db
            .prepare(
                `SELECT subscription FROM push_subscriptions WHERE sign_pub_key = ?`
            )
            .all(signPubKey) as { subscription: string }[];
        return rows.map((r) => JSON.parse(r.subscription));
    }

    remove(signPubKey: string, endpoint: string): void {
        this.db
            .prepare(
                `DELETE FROM push_subscriptions WHERE sign_pub_key = ? AND endpoint = ?`
            )
            .run(signPubKey, endpoint);
    }
}
