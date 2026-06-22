import { ref } from "vue";

import { nanoid } from "nanoid";

import { useIndexedDb, STORES } from "@shared/lib/useIndexedDb";

import type { User } from "shared";

const USER_ID = "current-user";

export function useUser() {
    const user = ref<User | null>(null);
    const { read, write } = useIndexedDb(STORES.USER);

    async function init(name: string, avatar: string): Promise<void> {
        const newUser: User = { id: nanoid(), name, avatar };
        await write(newUser, USER_ID);
        user.value = newUser;
    }

    async function load(): Promise<void> {
        user.value = await read<User>(USER_ID);
    }

    async function hasUser(): Promise<boolean> {
        return (await read<User>(USER_ID)) !== null;
    }

    return { user, init, load, hasUser };
}
