import type { ChatRepository } from "../repositories/ChatRepository.js";
import type { LocalFileStorage } from "../storage/LocalFileStorage.js";

export class FileService {
    constructor(
        private chatRepository: ChatRepository,
        private fileStorage: LocalFileStorage
    ) {}

    isAuthorized(chatId: string, signPubKey: string): boolean {
        return this.chatRepository
            .getAuthorizedKeys(chatId)
            .includes(signPubKey);
    }

    save(chatId: string, data: Buffer): string {
        return this.fileStorage.save(chatId, data);
    }

    read(chatId: string, fileId: string): Buffer {
        return this.fileStorage.read(chatId, fileId);
    }
}
