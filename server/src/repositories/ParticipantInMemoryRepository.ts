export class ParticipantInMemoryRepository {
    private participants = new Map<string, Set<string>>();

    add(chatId: string, userId: string): void {
        if (!this.participants.has(chatId))
            this.participants.set(chatId, new Set());
        this.participants.get(chatId)!.add(userId);
    }

    getIds(chatId: string): string[] {
        return [...(this.participants.get(chatId) ?? [])];
    }
}
