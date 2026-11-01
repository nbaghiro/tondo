import { summarise } from "@tondo/db";
import type { AccountStore, Draft, PageStore } from "@tondo/db";
import type { Page } from "@tondo/page";

/** Keeps addresses in memory, for tests. */
export function createFakeStore(): AccountStore & { suspend: (userId: string) => void } {
    const owners = new Map<string, string>();
    const suspended = new Set<string>();
    const handleOf = (userId: string) =>
        [...owners].find(([, owner]) => owner === userId)?.[0] ?? null;
    return {
        findHandle: (userId) => Promise.resolve(handleOf(userId)),
        handleTaken: (handle) => Promise.resolve(owners.has(handle)),
        claimHandle: (userId, handle) => {
            const owner = owners.get(handle);
            if (owner && owner !== userId) return Promise.resolve(false);
            if (!handleOf(userId)) owners.set(handle, userId);
            return Promise.resolve(handleOf(userId) === handle);
        },
        changeHandle: (userId, handle) => {
            const owner = owners.get(handle);
            if (owner && owner !== userId) return Promise.resolve(false);
            const before = handleOf(userId);
            if (before) owners.delete(before);
            owners.set(handle, userId);
            return Promise.resolve(true);
        },
        isSuspended: (userId) => Promise.resolve(suspended.has(userId)),
        suspend: (userId) => {
            suspended.add(userId);
        },
        removeUser: (userId) => {
            const before = handleOf(userId);
            if (before && suspended.has(userId)) owners.set(before, `removed:${before}`);
            else if (before) owners.delete(before);
            return Promise.resolve();
        },
    };
}

interface Row {
    handle: string;
    draft: Page;
    published: Page | null;
    updatedAt: number;
    suspended?: boolean;
}

/** Keeps pages in memory, for tests. */
export function createFakePages(seed: Readonly<Record<string, Page>> = {}) {
    const rows = new Map<string, Row>(
        Object.entries(seed).map(([handle, page]) => [
            `seed-${handle}`,
            { handle, draft: page, published: page, updatedAt: 1 },
        ]),
    );
    const counts: { pageId: string; target: string }[] = [];
    const toDraft = (row: Row): Draft => ({
        page: row.draft,
        updatedAt: String(row.updatedAt),
        published: row.published !== null,
        changed: JSON.stringify(row.draft) !== JSON.stringify(row.published),
        suspended: row.suspended === true,
    });
    const store: PageStore = {
        findLive: (handle) => {
            const row = [...rows].find(([, other]) => other.handle === handle);
            return Promise.resolve(
                row?.[1].published && !row[1].suspended
                    ? { id: row[0], page: row[1].published }
                    : null,
            );
        },
        handleOf: (userId) => Promise.resolve(rows.get(userId)?.handle ?? null),
        findDraft: (userId) => {
            const row = rows.get(userId);
            return Promise.resolve(row ? toDraft(row) : null);
        },
        saveDraft: (userId, page, updatedAt) => {
            const row = rows.get(userId);
            if (row?.updatedAt !== Number(updatedAt)) return Promise.resolve(null);
            row.draft = page;
            row.updatedAt += 1;
            return Promise.resolve(String(row.updatedAt));
        },
        publish: (userId, updatedAt) => {
            const row = rows.get(userId);
            if (row?.updatedAt !== Number(updatedAt)) return Promise.resolve(false);
            row.published = row.draft;
            return Promise.resolve(true);
        },
        count: (pageId, target) => {
            counts.push({ pageId, target });
            return Promise.resolve();
        },
        unpublish: (userId) => {
            const row = rows.get(userId);
            if (row) row.published = null;
            return Promise.resolve();
        },
        findOwnLive: (userId) => Promise.resolve(rows.get(userId)?.published ?? null),
        statsFor: (userId, days) => {
            const today = new Date().toISOString().slice(0, 10);
            return Promise.resolve(
                summarise(
                    counts
                        .filter((c) => c.pageId === userId)
                        .map(({ target }) => ({ target, day: today, count: 1 })),
                    days,
                ),
            );
        },
    };
    const addUser = (userId: string, handle: string, page: Page) => {
        rows.set(userId, { handle, draft: page, published: null, updatedAt: 1 });
    };
    const suspend = (userId: string) => {
        const row = rows.get(userId);
        if (row) row.suspended = true;
    };
    return { store, counts, addUser, suspend };
}
