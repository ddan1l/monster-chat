import type { Peer } from "../types.js";

// signPubKey → (deviceId → live WebSocket). Одно устройство больше не затирает
// другое: у аккаунта может быть несколько одновременных соединений.
// Заполняется на 'online', чистится при disconnect.
export class ConnectionInMemoryRepository {
    private connections = new Map<string, Map<string, Peer>>();

    set(signPubKey: string, deviceId: string, peer: Peer): void {
        let devices = this.connections.get(signPubKey);
        if (!devices) {
            devices = new Map();
            this.connections.set(signPubKey, devices);
        }
        devices.set(deviceId, peer);
    }

    // Любое живое соединение аккаунта — для одно-целевой доставки (до веера/Ф3).
    get(signPubKey: string): Peer | undefined {
        const devices = this.connections.get(signPubKey);
        if (!devices) return undefined;
        const peers = [...devices.values()];
        return peers[peers.length - 1];
    }

    // Конкретное устройство — для корректного disconnect (не удалить чужой сокет).
    getDevice(signPubKey: string, deviceId: string): Peer | undefined {
        return this.connections.get(signPubKey)?.get(deviceId);
    }

    // Все живые устройства аккаунта — для веерной доставки (Ф3).
    getDevices(signPubKey: string): Peer[] {
        return [...(this.connections.get(signPubKey)?.values() ?? [])];
    }

    delete(signPubKey: string, deviceId: string): void {
        const devices = this.connections.get(signPubKey);
        if (!devices) return;
        devices.delete(deviceId);
        if (devices.size === 0) this.connections.delete(signPubKey);
    }

    getAll(): Peer[] {
        const all: Peer[] = [];
        for (const devices of this.connections.values()) {
            all.push(...devices.values());
        }
        return all;
    }
}
