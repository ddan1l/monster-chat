const DB_NAME = "monster-chat";
const DB_VERSION = 9;

export const STORES = {
    KEYS: "keys",
    USER: "user",
    CHATS: "chats",
    MESSAGES: "messages",
    PEERS: "peers",
    PENDING_KNOCKS: "pending_knocks",
    CHAT_NOTIFICATIONS: "chat_notifications",
} as const;

export const INDEX_CHAT_ID = "chat_id_date";

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;

            if (!db.objectStoreNames.contains(STORES.KEYS)) {
                db.createObjectStore(STORES.KEYS);
            }

            if (!db.objectStoreNames.contains(STORES.USER)) {
                db.createObjectStore(STORES.USER);
            }

            if (!db.objectStoreNames.contains(STORES.CHATS)) {
                db.createObjectStore(STORES.CHATS, { keyPath: "id" });
            }

            if (!db.objectStoreNames.contains(STORES.PEERS)) {
                db.createObjectStore(STORES.PEERS);
            }

            if (!db.objectStoreNames.contains(STORES.PENDING_KNOCKS)) {
                db.createObjectStore(STORES.PENDING_KNOCKS);
            }

            if (!db.objectStoreNames.contains(STORES.CHAT_NOTIFICATIONS)) {
                db.createObjectStore(STORES.CHAT_NOTIFICATIONS, {
                    keyPath: "chatId",
                });
            }

            if (db.objectStoreNames.contains(STORES.MESSAGES)) {
                db.deleteObjectStore(STORES.MESSAGES);
            }
            const messageStore = db.createObjectStore(STORES.MESSAGES, {
                keyPath: "nonce",
            });
            messageStore.createIndex(INDEX_CHAT_ID, ["chatId", "timestamp"]);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    return dbPromise;
}

export function useIndexedDb(storeName: StoreName) {
    async function read<T>(key: string): Promise<T | null> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const req = db
                .transaction(storeName, "readonly")
                .objectStore(storeName)
                .get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }

    async function write<T>(value: T, key?: string): Promise<void> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const store = db
                .transaction(storeName, "readwrite")
                .objectStore(storeName);
            const req = key ? store.put(value, key) : store.put(value);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function readAll<T>(): Promise<T[]> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const req = db
                .transaction(storeName, "readonly")
                .objectStore(storeName)
                .getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function readByIndex<T>(
        indexName: string,
        value: IDBValidKey | IDBKeyRange
    ): Promise<T[]> {
        const db = await openDb();

        return new Promise((resolve, reject) => {
            const req = db
                .transaction(storeName, "readonly")
                .objectStore(storeName)
                .index(indexName)
                .getAll(value);

            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function readLastByIndex<T>(
        indexName: string,
        value: IDBValidKey | IDBKeyRange
    ): Promise<T | null> {
        const db = await openDb();

        return new Promise((resolve, reject) => {
            const req = db
                .transaction(storeName, "readonly")
                .objectStore(storeName)
                .index(indexName)
                .openCursor(value, "prev");

            req.onsuccess = () =>
                resolve(req.result ? (req.result.value as T) : null);
            req.onerror = () => reject(req.error);
        });
    }
    async function readByIndexCursor<T>(
        indexName: string,
        range: IDBKeyRange,
        limit: number,
        direction: IDBCursorDirection = "next"
    ): Promise<T[]> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const results: T[] = [];
            const req = db
                .transaction(storeName, "readonly")
                .objectStore(storeName)
                .index(indexName)
                .openCursor(range, direction);

            req.onsuccess = () => {
                const cursor = req.result;
                if (!cursor || results.length >= limit) {
                    resolve(results);
                    return;
                }
                results.push(cursor.value as T);
                cursor.continue();
            };
            req.onerror = () => reject(req.error);
        });
    }

    async function remove(key: string): Promise<void> {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const req = db
                .transaction(storeName, "readwrite")
                .objectStore(storeName)
                .delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    return {
        read,
        readAll,
        write,
        readByIndex,
        readByIndexCursor,
        readLastByIndex,
        remove,
    };
}
