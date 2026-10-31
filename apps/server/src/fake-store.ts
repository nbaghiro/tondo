import type { AccountStore } from "@tondo/db";

/** Keeps addresses in memory, for tests. */
export function createFakeStore(): AccountStore {
    const owners = new Map<string, string>();
    const handleOf = (userId: string) =>
        [...owners].find(([, owner]) => owner === userId)?.[0] ?? null;
    return {
        findHandle: (userId) => Promise.resolve(handleOf(userId)),
        claimHandle: (userId, handle) => {
            const owner = owners.get(handle);
            if (owner && owner !== userId) return Promise.resolve(false);
            if (!handleOf(userId)) owners.set(handle, userId);
            return Promise.resolve(handleOf(userId) === handle);
        },
    };
}
