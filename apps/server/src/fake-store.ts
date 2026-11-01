import type { AccountStore, Draft, PageStore } from "@tondo/db";
import type { Page } from "@tondo/page";

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

interface Row {
    handle: string;
    draft: Page;
    published: Page | null;
    updatedAt: number;
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
    });
    const store: PageStore = {
        findLive: (handle) => {
            const row = [...rows].find(([, other]) => other.handle === handle);
            return Promise.resolve(
                row?.[1].published ? { id: row[0], page: row[1].published } : null,
            );
        },
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
        statsFor: (userId) =>
            Promise.resolve({
                views: counts.filter((c) => c.pageId === userId && !c.target).length,
                clicks: counts.filter((c) => c.pageId === userId && c.target).length,
            }),
    };
    const addUser = (userId: string, handle: string, page: Page) => {
        rows.set(userId, { handle, draft: page, published: null, updatedAt: 1 });
    };
    return { store, counts, addUser };
}
