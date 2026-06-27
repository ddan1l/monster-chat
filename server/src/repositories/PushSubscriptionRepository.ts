export interface PushSubscriptionRecord {
    signPubKey: string;
    subscription: PushSubscriptionJSON;
}

export interface PushSubscriptionRepository {
    save(signPubKey: string, subscription: PushSubscriptionJSON): void;
    findAll(signPubKey: string): PushSubscriptionJSON[];
    remove(signPubKey: string, endpoint: string): void;
}
