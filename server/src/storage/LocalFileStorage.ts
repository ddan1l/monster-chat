import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

export class LocalFileStorage {
    constructor(private uploadsDir: string) {
        mkdirSync(uploadsDir, { recursive: true });
    }

    save(chatId: string, data: Buffer): string {
        const fileId = crypto.randomUUID();
        const dir = join(this.uploadsDir, chatId);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, fileId), data);
        return fileId;
    }

    read(chatId: string, fileId: string): Buffer {
        return readFileSync(join(this.uploadsDir, chatId, fileId));
    }
}
