import { useCrypto, toBase64, fromBase64 } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";

// Эпохальные ключи устройства (FS, Фаза 4). Каждое устройство держит свою
// ротируемую ECDH-пару эпохи; шифрование входящих идёт под её публичную часть.
// Приватники хранятся в IDB, обёрнутые ключом устройства (#5, storageKey), и в
// открытую его не покидают. Ротация/уничтожение старых — в 4.4.
const CURRENT_KEY = "epoch_current";
const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // сутки
// Держим N последних эпох для расшифровки отложенного. Окно W = RETENTION ×
// ROTATION = 7 дней === серверный MSG_TTL. Ротация идёт максимум раз в сутки
// (getCurrentEpoch), поэтому 7 эпох ≥ 7 дней wall-clock: любое сообщение,
// которое сервер ещё хранит (≤W), гарантированно вскрывается своей эпохой.
// Больше окно ⇒ дольше офлайн-доступность, но слабее forward secrecy.
const RETENTION = 7;

export function useEpochKeys() {
    const { storageKey, encrypt, decrypt, sign } = useCrypto();
    const { read, write, remove } = useIndexedDb(STORES.KEYS);

    function generate(): Promise<CryptoKeyPair> {
        return crypto.subtle.generateKey(
            { name: "ECDH", namedCurve: "P-256" },
            true,
            ["deriveKey"]
        );
    }

    async function storeEpoch(
        epochId: number,
        keyPair: CryptoKeyPair
    ): Promise<void> {
        if (!storageKey.value) {
            throw new Error("Storage key not loaded");
        }
        const [pkcs8, rawPub] = await Promise.all([
            crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
            crypto.subtle.exportKey("raw", keyPair.publicKey),
        ]);
        // Приватник шифруем ключом устройства; base64 — т.к. encrypt берёт строку.
        const { payload, iv } = await encrypt(
            storageKey.value,
            toBase64(pkcs8)
        );
        await Promise.all([
            write(toBase64(payload), `epoch_${epochId}_priv`),
            write(toBase64(iv), `epoch_${epochId}_iv`),
            write(toBase64(rawPub), `epoch_${epochId}_pub`),
        ]);
    }

    async function loadEpoch(epochId: number): Promise<CryptoKeyPair> {
        if (!storageKey.value) {
            throw new Error("Storage key not loaded");
        }
        const [priv, iv, pub] = await Promise.all([
            read<string>(`epoch_${epochId}_priv`),
            read<string>(`epoch_${epochId}_iv`),
            read<string>(`epoch_${epochId}_pub`),
        ]);
        if (!priv || !iv || !pub) {
            throw new Error("Epoch key missing");
        }
        const pkcs8B64 = await decrypt(
            storageKey.value,
            fromBase64(priv),
            new Uint8Array(fromBase64(iv))
        );
        const [privateKey, publicKey] = await Promise.all([
            crypto.subtle.importKey(
                "pkcs8",
                fromBase64(pkcs8B64),
                { name: "ECDH", namedCurve: "P-256" },
                true,
                ["deriveKey"]
            ),
            crypto.subtle.importKey(
                "raw",
                fromBase64(pub),
                { name: "ECDH", namedCurve: "P-256" },
                true,
                []
            ),
        ]);
        return { privateKey, publicKey };
    }

    async function createEpoch(
        epochId: number
    ): Promise<{ epochId: number; keyPair: CryptoKeyPair }> {
        const keyPair = await generate();
        await storeEpoch(epochId, keyPair);
        await write(Date.now(), `epoch_${epochId}_created`);
        await write(epochId, CURRENT_KEY);
        return { epochId, keyPair };
    }

    // Уничтожает приватник эпохи и её метаданные — после этого сообщения,
    // зашифрованные под неё, нерасшифровываемы. Ядро forward secrecy.
    async function destroyEpoch(epochId: number): Promise<void> {
        if (epochId < 1) {
            return;
        }
        await Promise.all([
            remove(`epoch_${epochId}_priv`),
            remove(`epoch_${epochId}_iv`),
            remove(`epoch_${epochId}_pub`),
            remove(`epoch_${epochId}_created`),
        ]);
    }

    // Текущая эпоха. Первое обращение — эпоха 1. Если текущая старше интервала —
    // заводим новую и уничтожаем вышедшую за окно ретеншена (FS включается тут).
    async function getCurrentEpoch(): Promise<{
        epochId: number;
        keyPair: CryptoKeyPair;
    }> {
        const existing = await read<number>(CURRENT_KEY);
        if (existing === null) {
            return createEpoch(1);
        }

        const created = (await read<number>(`epoch_${existing}_created`)) ?? 0;
        if (Date.now() - created > ROTATION_INTERVAL_MS) {
            const rotated = await createEpoch(existing + 1);
            await destroyEpoch(rotated.epochId - RETENTION);
            return rotated;
        }
        return { epochId: existing, keyPair: await loadEpoch(existing) };
    }

    // Публичная часть текущей эпохи, подписанная identity-sign-ключом — пир
    // доверяет ей как ключу аккаунта. Формат сообщения publish_prekey.
    async function exportSignedPrekey(): Promise<{
        epochId: number;
        epochPub: string;
        signature: string;
    }> {
        const { epochId, keyPair } = await getCurrentEpoch();
        const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
        const signature = await sign(rawPub);
        return {
            epochId,
            epochPub: toBase64(rawPub),
            signature: toBase64(signature),
        };
    }

    return { getCurrentEpoch, loadEpoch, exportSignedPrekey };
}
