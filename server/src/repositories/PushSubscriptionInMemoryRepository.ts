import type { PushSubscriptionRepository } from "./PushSubscriptionRepository.js";

export class PushSubscriptionInMemoryRepository implements PushSubscriptionRepository {
    private store = new Map<string, PushSubscriptionJSON[]>();

    save(signPubKey: string, subscription: PushSubscriptionJSON): void {
        const list = this.store.get(signPubKey) ?? [];
        const exists = list.some((s) => s.endpoint === subscription.endpoint);
        if (!exists) list.push(subscription);
        this.store.set(signPubKey, list);
    }

    findAll(signPubKey: string): PushSubscriptionJSON[] {
        return this.store.get(signPubKey) ?? [];
    }

    remove(signPubKey: string, endpoint: string): void {
        const list = this.store.get(signPubKey) ?? [];
        this.store.set(
            signPubKey,
            list.filter((s) => s.endpoint !== endpoint)
        );
    }
}
