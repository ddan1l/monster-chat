const DB_NAME = "monster-chat";
const DB_VERSION = 4;

export const STORES = {
    KEYS: "keys",
    USER: "user",
    CHATS: "chats",
    MESSAGES: "messages",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

export async function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
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

            if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
                const messageStore = db.createObjectStore(STORES.MESSAGES, {
                    keyPath: "id",
                });
                messageStore.createIndex("by_chatId", "chatId");
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
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
        value: string
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

    return { read, readAll, write, readByIndex, remove };
}
