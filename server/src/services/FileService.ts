import type { LocalFileStorage } from "../storage/LocalFileStorage.js";

export class FileService {
    constructor(private fileStorage: LocalFileStorage) {}

    save(chatId: string, data: Buffer): string {
        return this.fileStorage.save(chatId, data);
    }

    read(chatId: string, fileId: string): Buffer {
        return this.fileStorage.read(chatId, fileId);
    }
}
