export interface PushService {
    notify(signPubKey: string, chatId: string): void;
}
