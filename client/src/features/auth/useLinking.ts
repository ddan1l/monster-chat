import { useCrypto, toBase64, fromBase64 } from "@shared/crypto/useCrypto";
import { useIndexedDb, STORES } from "@shared/storage/useIndexedDb";

import { useKeyWrap } from "./useKeyWrap";

import type { Chat, PeerInfo, User } from "shared";

type StoredPeer = PeerInfo & { chatId: string };

const USER_ID = "current-user";

// Одноразовый код: без похожих символов (0/O/1/I), 12 знаков (~60 бит) — он
// единственный барьер к блобу с приватными identity-ключами.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 12;

export interface LinkBundle {
    ecdh: CryptoKeyPair;
    sign: CryptoKeyPair;
    user: User | null;
    chats: Chat[];
    peers: StoredPeer[];
}

interface Transfer {
    salt: string;
    iv: string;
    data: string;
}

interface BundleData {
    v: number;
    ecdhPriv: string;
    ecdhPub: string;
    signPriv: string;
    signPub: string;
    user: User | null;
    chats: Chat[];
    peers: StoredPeer[];
}

function generateCode(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LEN));
    return [...bytes]
        .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
        .join("");
}

// Линковка устройства (модель A): переносим identity-ключи + профиль + чаты +
// peer-инфо. Историю сообщений не переносим — новое устройство подтянет её с
// сервера через getAfter. Транспорт — локальный: зашифрованный под одноразовым
// кодом блоб (сервер не участвует, приватные ключи в открытую не покидают
// устройство).
export function useLinking() {
    const { encryptionKeyPair, signKeyPair, encrypt, decrypt } = useCrypto();
    const { deriveFromPin, randomBytes } = useKeyWrap();
    const userDb = useIndexedDb(STORES.USER);
    const chatsDb = useIndexedDb(STORES.CHATS);
    const peersDb = useIndexedDb(STORES.PEERS);

    // Примари: собирает бандл, шифрует под свежим кодом. Возвращает строку
    // переноса (блоб) и код — их показываем раздельно.
    async function exportBundle(): Promise<{ transfer: string; code: string }> {
        if (!encryptionKeyPair.value || !signKeyPair.value) {
            throw new Error("Keys not loaded");
        }
        const [ecdhPriv, ecdhPub, signPriv, signPub] = await Promise.all([
            crypto.subtle.exportKey(
                "pkcs8",
                encryptionKeyPair.value.privateKey
            ),
            crypto.subtle.exportKey("raw", encryptionKeyPair.value.publicKey),
            crypto.subtle.exportKey("pkcs8", signKeyPair.value.privateKey),
            crypto.subtle.exportKey("raw", signKeyPair.value.publicKey),
        ]);
        const [user, chats, peers] = await Promise.all([
            userDb.read<User>(USER_ID),
            chatsDb.readAll<Chat>(),
            peersDb.readAll<StoredPeer>(),
        ]);
        const bundle: BundleData = {
            v: 1,
            ecdhPriv: toBase64(ecdhPriv),
            ecdhPub: toBase64(ecdhPub),
            signPriv: toBase64(signPriv),
            signPub: toBase64(signPub),
            user,
            chats,
            peers,
        };

        const code = generateCode();
        const salt = randomBytes(16);
        const wrappingKey = await deriveFromPin(code, salt);
        const { payload, iv } = await encrypt(
            wrappingKey,
            JSON.stringify(bundle)
        );
        const transferObj: Transfer = {
            salt: toBase64(salt),
            iv: toBase64(iv),
            data: toBase64(payload),
        };
        const transfer = toBase64(
            new TextEncoder().encode(JSON.stringify(transferObj))
        );
        return { transfer, code };
    }

    // Новое устройство: расшифровывает блоб кодом, импортирует ключи в память.
    // Неверный код → AES-GCM бросит (несовпадение тега) — вызывающий покажет
    // ошибку.
    async function importBundle(
        transfer: string,
        code: string
    ): Promise<LinkBundle> {
        const transferObj = JSON.parse(
            new TextDecoder().decode(fromBase64(transfer))
        ) as Transfer;
        const salt = new Uint8Array(fromBase64(transferObj.salt));
        const wrappingKey = await deriveFromPin(code, salt);
        const json = await decrypt(
            wrappingKey,
            fromBase64(transferObj.data),
            new Uint8Array(fromBase64(transferObj.iv))
        );
        const bundle = JSON.parse(json) as BundleData;

        const [ecdhPrivate, ecdhPublic, signPrivate, signPublic] =
            await Promise.all([
                crypto.subtle.importKey(
                    "pkcs8",
                    fromBase64(bundle.ecdhPriv),
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    ["deriveKey"]
                ),
                crypto.subtle.importKey(
                    "raw",
                    fromBase64(bundle.ecdhPub),
                    { name: "ECDH", namedCurve: "P-256" },
                    true,
                    []
                ),
                crypto.subtle.importKey(
                    "pkcs8",
                    fromBase64(bundle.signPriv),
                    { name: "ECDSA", namedCurve: "P-256" },
                    true,
                    ["sign"]
                ),
                crypto.subtle.importKey(
                    "raw",
                    fromBase64(bundle.signPub),
                    { name: "ECDSA", namedCurve: "P-256" },
                    true,
                    ["verify"]
                ),
            ]);

        return {
            ecdh: { privateKey: ecdhPrivate, publicKey: ecdhPublic },
            sign: { privateKey: signPrivate, publicKey: signPublic },
            user: bundle.user ?? null,
            chats: bundle.chats ?? [],
            peers: bundle.peers ?? [],
        };
    }

    // Пишет профиль/чаты/peer-инфо нового устройства в IDB.
    async function storeImported(bundle: LinkBundle): Promise<void> {
        if (bundle.user) await userDb.write(bundle.user, USER_ID);
        await Promise.all(bundle.chats.map((c) => chatsDb.write(c)));
        await Promise.all(bundle.peers.map((p) => peersDb.write(p, p.chatId)));
    }

    return { exportBundle, importBundle, storeImported };
}
