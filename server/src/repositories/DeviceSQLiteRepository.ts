import Database from "better-sqlite3";

import type { DeviceRepository } from "./DeviceRepository.js";
import type { DevicePrekey } from "shared";

// Кэп устройств на аккаунт — против amplification: без него аккаунт мог бы
// нарегать сколько угодно фейковых устройств, и каждый отправитель шифровал бы
// копию под каждое. Держим N последних по last_seen.
const MAX_DEVICES_PER_ACCOUNT = 20;

// Персистентный реестр устройств: строка на пару (аккаунт, устройство).
// last_seen обновляется при каждом входе — пригодится для TTL-чистки (Ф4).
// device_prekeys держит ТЕКУЩИЙ эпохальный prekey каждого устройства (FS).
export class DeviceSQLiteRepository implements DeviceRepository {
    constructor(private db: Database.Database) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS devices (
                sign_pub_key TEXT    NOT NULL,
                device_id    TEXT    NOT NULL,
                last_seen    INTEGER NOT NULL,
                PRIMARY KEY (sign_pub_key, device_id)
            )
        `);
        db.exec(`
            CREATE TABLE IF NOT EXISTS device_prekeys (
                sign_pub_key TEXT    NOT NULL,
                device_id    TEXT    NOT NULL,
                epoch_id     INTEGER NOT NULL,
                epoch_pub    TEXT    NOT NULL,
                signature    TEXT    NOT NULL,
                PRIMARY KEY (sign_pub_key, device_id)
            )
        `);
    }

    // Один текущий prekey на устройство — новая эпоха перезаписывает предыдущую.
    setPrekey(
        signPubKey: string,
        deviceId: string,
        epochId: number,
        epochPub: string,
        signature: string
    ): void {
        this.db
            .prepare(
                `INSERT INTO device_prekeys
                     (sign_pub_key, device_id, epoch_id, epoch_pub, signature)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(sign_pub_key, device_id) DO UPDATE SET
                     epoch_id = excluded.epoch_id,
                     epoch_pub = excluded.epoch_pub,
                     signature = excluded.signature`
            )
            .run(signPubKey, deviceId, epochId, epochPub, signature);
    }

    getPrekeys(signPubKey: string): DevicePrekey[] {
        const rows = this.db
            .prepare(
                `SELECT device_id, epoch_id, epoch_pub, signature
                 FROM device_prekeys WHERE sign_pub_key = ?`
            )
            .all(signPubKey) as {
            device_id: string;
            epoch_id: number;
            epoch_pub: string;
            signature: string;
        }[];
        return rows.map((r) => ({
            deviceId: r.device_id,
            epochId: r.epoch_id,
            epochPub: r.epoch_pub,
            signature: r.signature,
        }));
    }

    // Upsert: первое появление устройства регистрирует его, повторное — лишь
    // обновляет last_seen (идемпотентно по первичному ключу).
    add(signPubKey: string, deviceId: string): void {
        this.db
            .prepare(
                `INSERT INTO devices (sign_pub_key, device_id, last_seen)
                 VALUES (?, ?, ?)
                 ON CONFLICT(sign_pub_key, device_id)
                 DO UPDATE SET last_seen = excluded.last_seen`
            )
            .run(signPubKey, deviceId, Date.now());

        // Вытесняем всё, кроме N самых свежих устройств аккаунта.
        this.db
            .prepare(
                `DELETE FROM devices
                 WHERE sign_pub_key = ? AND device_id NOT IN (
                     SELECT device_id FROM devices WHERE sign_pub_key = ?
                     ORDER BY last_seen DESC LIMIT ?
                 )`
            )
            .run(signPubKey, signPubKey, MAX_DEVICES_PER_ACCOUNT);
        // Чистим prekey осиротевших устройств.
        this.db
            .prepare(
                `DELETE FROM device_prekeys
                 WHERE sign_pub_key = ? AND device_id NOT IN (
                     SELECT device_id FROM devices WHERE sign_pub_key = ?
                 )`
            )
            .run(signPubKey, signPubKey);
    }

    getDevices(signPubKey: string): string[] {
        const rows = this.db
            .prepare(`SELECT device_id FROM devices WHERE sign_pub_key = ?`)
            .all(signPubKey) as { device_id: string }[];
        return rows.map((r) => r.device_id);
    }

    remove(signPubKey: string, deviceId: string): void {
        this.db
            .prepare(
                `DELETE FROM devices WHERE sign_pub_key = ? AND device_id = ?`
            )
            .run(signPubKey, deviceId);
    }
}
